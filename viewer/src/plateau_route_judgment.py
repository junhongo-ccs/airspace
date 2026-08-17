"""6-11〜6-13: 航路照会結果の文章化。

現行の`ground_feature_voxel`照会（Laravel実API、空間ID完全一致・分類/外形なし・
件数しか意味を持たない）を、航路との位置関係判定と画面表示の根拠にしない
（改善タスク§9）。代わりに、6-2/6-2aで再抽出したメッシュ単位GeoJSON
（`plateau_buildings.py`/`plateau_ground_features.py`のbboxローダ）を使い、航路の
表示範囲（bbox）に入る地物を実際に取得し、水平方向の重なりを判定して文章化する。

建物は既存のAGL・建物高比較ロジック（`altitude.py`のevaluate_building_vertical）を
そのまま使う（改善タスク6-11「建物は既存のAGLと建物高の比較ロジックを維持する」）。
道路・土砂災害・洪水浸水・土地利用は、分類・外形が取得できた地物だけを対象に、
水平方向の重なり（交差）または近接（bboxのmargin範囲内）を判定する。

6-13の区分（「航路への影響」/「航路活用の可能性」）をGROUP_*として結果に付与する。
土砂災害・洪水浸水（GROUP_OPPORTUNITY）には、区域データであって発災状況や飛行禁止の
確定判断ではないという免責（6-12）を`LANDSLIDE_FLOOD_DISCLAIMER`として別途持つ
（結果表示・詳細表示の該当グループ見出しにまとめて出す想定。行ごとの繰り返しは
かえって読みにくくなるため避ける）。
"""

from __future__ import annotations

from .altitude import evaluate_building_vertical
from .plateau_buildings import get_buildings_in_bbox
from .plateau_ground_features import get_ground_features_in_bbox

GROUP_IMPACT = "impact"
GROUP_OPPORTUNITY = "opportunity"
GROUP_LANDUSE = "landuse"

_GROUND_LAYER_GROUPS = {
    "road": GROUP_IMPACT,
    "landslide": GROUP_OPPORTUNITY,
    "flood": GROUP_OPPORTUNITY,
    "landuse": GROUP_LANDUSE,
}

LANDSLIDE_FLOOD_DISCLAIMER = (
    "区域データであり、発災状況や飛行禁止の確定判断ではありません。"
    "実際の運航判断には最新の公的情報を確認してください。"
)

# 6-11で許容する近接範囲（度）。航路bboxに対してこの分だけ広げた範囲内の地物を
# 「航路付近」として結果に含める。query_features_endpointのmargin_degreesと
# 同じ値を渡す想定（ユーザー指定の照会範囲＝「近接」の定義とする）。


def _polygon_bbox(geometry: dict) -> tuple[float, float, float, float]:
    """GeoJSON Polygon/MultiPolygon（[lon, lat]座標）から(min_lat, min_lon, max_lat, max_lon)を返す。"""
    if geometry["type"] == "Polygon":
        rings = geometry["coordinates"]
    else:
        rings = [ring for part in geometry["coordinates"] for ring in part]
    lats = [pt[1] for ring in rings for pt in ring]
    lons = [pt[0] for ring in rings for pt in ring]
    return min(lats), min(lons), max(lats), max(lons)


def _bbox_overlap(a: tuple, b: tuple) -> bool:
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


def _ground_feature_sentence(layer: str, class_label: str | None, extra_label: str | None) -> str:
    """交差している地物（1件ずつ表示）向けの文章。"""
    label = class_label or "分類不明"
    if layer == "landslide":
        detail = f"（区域種別：{label}）" if class_label else ""
        return f"航路が土砂災害警戒区域に重なっています{detail}"
    if layer == "flood":
        scale = f"・{extra_label}" if extra_label else ""
        return f"航路が洪水浸水想定区域に重なっています（浸水深：{label}{scale}）"
    if layer == "road":
        return f"航路が道路（{label}）と重なっています"
    if layer == "landuse":
        return f"航路が{label}に重なっています"
    return "要確認"


_LAYER_NEARBY_LABELS = {
    "building": "建物",
    "road": "道路",
    "landslide": "土砂災害警戒区域",
    "flood": "洪水浸水想定区域",
    "landuse": None,  # 土地利用はclass_label自体が地物名になるため接頭辞を付けない
}


def _nearby_summary_sentence(layer: str, class_label: str | None, count: int) -> str:
    """交差していない地物（分類ごとに集約して1文で表示）向けの文章。

    個々のポリゴンを行として並べると、密集レイヤ（洪水浸水等）でmargin範囲内に
    数百件出ることがあり（2026-08-17実測、471件）、かえって読みにくく判断の
    妨げになる。交差なしの地物は分類単位で集約し、件数と「交差していません」を
    明記する（`土砂災害 1件`のような単独件数表示にしないための6-11の要求は、
    交差の有無を必ず文章内に含めることで満たす）。
    """
    base = _LAYER_NEARBY_LABELS.get(layer)
    if layer == "landuse":
        subject = class_label or "分類不明の土地利用"
    elif class_label:
        subject = f"{base}（{class_label}）"
    else:
        subject = base or layer
    return f"航路付近に{subject}が{count}件ありますが、航路とは交差していません。"


def judge_route_features(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    margin_degrees: float,
    altitude_m: float | None,
) -> dict:
    """航路周辺（bbox）の建物・道路・土砂災害・洪水浸水・土地利用を取得し、文章化する。

    候補地物は「航路bboxをmargin_degreesだけ広げた範囲」から取得する（＝「航路付近」の
    定義）。そのうち航路自体のbbox（marginなし）と重なるものは`intersecting`へ
    1件ずつ、重ならないものは密集レイヤで数百件になりうる（2026-08-17実測、
    flood 471件）ため`nearby_summary`へ(レイヤ,分類)単位で集約して返す。
    """
    query_min_lat = min(start_lat, end_lat) - margin_degrees
    query_max_lat = max(start_lat, end_lat) + margin_degrees
    query_min_lon = min(start_lon, end_lon) - margin_degrees
    query_max_lon = max(start_lon, end_lon) + margin_degrees
    exact_bbox = (
        min(start_lat, end_lat),
        min(start_lon, end_lon),
        max(start_lat, end_lat),
        max(start_lon, end_lon),
    )

    intersecting: list[dict] = []
    nearby_counts: dict[tuple[str, str, str | None], int] = {}

    def record_nearby(layer: str, group: str, class_label: str | None) -> None:
        key = (layer, group, class_label)
        nearby_counts[key] = nearby_counts.get(key, 0) + 1

    buildings = get_buildings_in_bbox(query_min_lat, query_max_lat, query_min_lon, query_max_lon)
    for f in buildings:
        f_bbox = _polygon_bbox(f["geometry"])
        height_m = f["properties"].get("height_m")
        if _bbox_overlap(f_bbox, exact_bbox):
            intersecting.append(
                {
                    "id": f["id"],
                    "layer": "building",
                    "group": GROUP_IMPACT,
                    "class_label": None,
                    "height_m": height_m,
                    "intersect": evaluate_building_vertical(height_m, altitude_m),
                }
            )
        else:
            record_nearby("building", GROUP_IMPACT, None)

    for layer, group in _GROUND_LAYER_GROUPS.items():
        features = get_ground_features_in_bbox(layer, query_min_lat, query_max_lat, query_min_lon, query_max_lon)
        for f in features:
            f_bbox = _polygon_bbox(f["geometry"])
            props = f["properties"]
            class_label = props.get("class_label")
            if _bbox_overlap(f_bbox, exact_bbox):
                intersecting.append(
                    {
                        "id": f["id"],
                        "layer": layer,
                        "group": group,
                        "class_label": class_label,
                        "intersect": _ground_feature_sentence(layer, class_label, props.get("scale_label")),
                    }
                )
            else:
                record_nearby(layer, group, class_label)

    nearby_summary = [
        {
            "layer": layer,
            "group": group,
            "class_label": class_label,
            "count": count,
            "sentence": _nearby_summary_sentence(layer, class_label, count),
        }
        for (layer, group, class_label), count in sorted(nearby_counts.items(), key=lambda kv: kv[0])
    ]

    return {"intersecting": intersecting, "nearby_summary": nearby_summary}
