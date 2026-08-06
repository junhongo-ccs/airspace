"""design.md §7・§7-1: 結果テーブル。§10-1: 空状態・エラー・処理中表示。
§4-1: 「登録・照会結果」「交差・詳細表／ダウンロード」の2エリアに対応する。
"""

from __future__ import annotations

import io
import json

import pandas as pd
import streamlit as st

from ..config import DISCLAIMER_TEXT


def _bbox(coords: list[tuple]) -> tuple:
    lats = [c[0] for c in coords]
    lons = [c[1] for c in coords]
    return min(lats), min(lons), max(lats), max(lons)


def _bbox_overlap(a: tuple, b: tuple) -> bool:
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


def render_registration_result(result: dict | None) -> None:
    """design.md §4-1「登録・照会結果」エリア（登録側）。"""
    if result is None:
        st.info("まだ航路が登録されていません。左のパネルから登録してください。")
        return
    if not result.get("ok"):
        st.error(
            f"取得できませんでした（エンドポイント: {result.get('endpoint', '-')}、"
            f"HTTPステータス: {result.get('status_code', '-')})"
        )
        if st.button("再試行", key="retry_register"):
            st.rerun()
        return
    st.success(
        f"登録件数: {result['before_count']} → {result['after_count']}件"
        f" ／ API応答時刻: {result['responded_at']}"
    )
    with st.expander("API応答（登録）", expanded=False):
        st.code(json.dumps(result["record"], ensure_ascii=False, indent=2, default=str), language="json")


def render_query_result_summary(result: dict | None) -> None:
    """design.md §4-1「登録・照会結果」エリア（照会側）。"""
    if result is None:
        st.info("まだ照会していません。左のパネルから「周辺データを照会」を実行してください。")
        return
    if not result.get("ok"):
        st.error(
            f"取得できませんでした（エンドポイント: {result.get('endpoint', '-')}、"
            f"HTTPステータス: {result.get('status_code', '-')})"
        )
        if st.button("再試行", key="retry_query"):
            st.rerun()
        return
    counts = {
        "routes": ("航路", result["routes"]),
        "voxels": ("地物ボクセル", result["voxels"]),
        "areas": ("注意区域", result["areas"]),
        "prohibited": ("禁止区域", result["prohibited"]),
    }
    errors = result.get("errors", {})
    summary = " ／ ".join(
        f"{label}: 取得失敗" if key in errors else f"{label}: {len(items)}件" for key, (label, items) in counts.items()
    )
    if errors:
        st.warning(summary + f" ／ API応答時刻: {result['responded_at']}")
        for key, (label, _items) in counts.items():
            if key in errors:
                err = errors[key]
                st.caption(
                    f"{label}の取得に失敗: エンドポイント {err.get('endpoint', '-')}、"
                    f"HTTPステータス {err.get('status_code', '-')}、詳細: {err.get('error', '-')}"
                )
    else:
        st.success(summary + f" ／ API応答時刻: {result['responded_at']}")
        if all(len(items) == 0 for _label, items in counts.values()):
            st.warning("該当するデータがありません。対象範囲・レイヤ設定を確認してください。")


def build_result_rows(query_result: dict | None) -> list[dict]:
    """design.md §7-1 必須列を満たす行データを組み立てる。

    「交差判定」は水平方向のバウンディングボックス重なりのみを見た簡易判定である。
    仕様書§5-3の高度基準統一が未完了のため、垂直方向の判定は一切行わない
    （design.md §9-2に対応）。
    """
    if not query_result or not query_result.get("ok"):
        return []

    responded_at = query_result["responded_at"]
    route_bboxes = []
    rows: list[dict] = []

    for route in query_result["routes"]:
        pts = [(route["start"]["lat"], route["start"]["lon"]), (route["end"]["lat"], route["end"]["lon"])]
        route_bboxes.append(_bbox(pts))
        rows.append(
            {
                "取得日時": responded_at,
                "データ出典": route.get("source", "-"),
                "レイヤ種別": "航路",
                "区分": "PoC" if route.get("is_poc") else "実データ",
                "座標参照系／高度基準": "未検証（仕様書§5-3）",
                "交差判定": "-",
                "名称": route.get("name"),
            }
        )

    def _intersect_flag(poly_pts: list[tuple]) -> str:
        pb = _bbox(poly_pts)
        if any(_bbox_overlap(pb, rb) for rb in route_bboxes):
            return "要確認（水平方向・簡易判定）"
        return "交差なし（水平方向・簡易判定）"

    # object_cdの割り当て（api_client.py OBJECT_CD_LAYERSと対応）に基づく表示ラベル
    voxel_layer_labels = {
        "building": "建物",
        "road": "道路",
        "landslide": "土砂災害",
        "flood": "洪水浸水",
    }

    for voxel in query_result["voxels"]:
        is_placeholder = "mock" in str(voxel.get("source", ""))
        if is_placeholder:
            intersect = "要確認（属性不足・プレースホルダ）"
        elif "footprint" in voxel:
            intersect = _intersect_flag(voxel["footprint"])
        else:
            intersect = "要確認（ジオメトリ未提供・ボクセル形式）"
        rows.append(
            {
                "取得日時": responded_at,
                "データ出典": voxel.get("source", "-"),
                "レイヤ種別": voxel_layer_labels.get(voxel.get("layer"), voxel.get("layer", "地物")),
                "区分": "PoC" if voxel.get("is_poc") else "実データ",
                "座標参照系／高度基準": "未検証（仕様書§5-3）",
                "交差判定": intersect,
                "名称": voxel.get("id"),
            }
        )

    def _area_intersect(area: dict) -> str:
        if "polygon" not in area:
            return "要確認（ジオメトリ未提供・ボクセル形式）"
        return _intersect_flag([(p["lat"], p["lon"]) for p in area["polygon"]])

    for area in query_result["areas"]:
        rows.append(
            {
                "取得日時": responded_at,
                "データ出典": area.get("source", "-"),
                "レイヤ種別": "注意区域",
                "区分": "PoC" if area.get("is_poc") else "実データ",
                "座標参照系／高度基準": "未検証（仕様書§5-3）",
                "交差判定": _area_intersect(area),
                "名称": area.get("name"),
            }
        )

    for area in query_result["prohibited"]:
        rows.append(
            {
                "取得日時": responded_at,
                "データ出典": area.get("source", "-"),
                "レイヤ種別": "禁止区域",
                "区分": "PoC" if area.get("is_poc") else "実データ",
                "座標参照系／高度基準": "未検証（仕様書§5-3）",
                "交差判定": _area_intersect(area),
                "名称": area.get("name"),
            }
        )
    return rows


def render_intersection_table(query_result: dict | None) -> None:
    """design.md §4-1「交差・詳細表／ダウンロード」エリア。"""
    if query_result is None:
        st.info("まだ照会していません。")
        return
    if not query_result.get("ok"):
        st.warning("直前の照会が失敗しているため、詳細表は表示できません。")
        return

    rows = build_result_rows(query_result)
    if not rows:
        st.info("該当するデータがありません。適用中の条件: 対象範囲内に航路・地物・エリアの登録がありません。")
        return

    df = pd.DataFrame(rows)
    st.dataframe(df, use_container_width=True, hide_index=True)

    attention_rows = df[df["交差判定"].str.startswith("要確認")]
    if not attention_rows.empty:
        st.markdown(
            f'<span class="attention-badge">要確認 {len(attention_rows)}件</span>', unsafe_allow_html=True
        )

    _render_downloads(df, query_result)


def _render_downloads(df: pd.DataFrame, query_result: dict) -> None:
    """design.md §9-4: ダウンロード出力にも免責文言を同一文字列で含める。"""
    csv_buf = io.StringIO()
    csv_buf.write(f"# {DISCLAIMER_TEXT}\n")
    df.to_csv(csv_buf, index=False)
    st.download_button(
        "CSVダウンロード",
        data=csv_buf.getvalue().encode("utf-8-sig"),
        file_name="poc_chichibu_result.csv",
        mime="text/csv",
    )

    geojson = _to_geojson(query_result)
    geojson["properties_disclaimer"] = DISCLAIMER_TEXT
    st.download_button(
        "GeoJSONダウンロード",
        data=json.dumps(geojson, ensure_ascii=False, indent=2, default=str).encode("utf-8"),
        file_name="poc_chichibu_result.geojson",
        mime="application/geo+json",
    )


def _to_geojson(query_result: dict) -> dict:
    features = []
    for route in query_result["routes"]:
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [route["start"]["lon"], route["start"]["lat"]],
                        [route["end"]["lon"], route["end"]["lat"]],
                    ],
                },
                "properties": {"layer": "route", "name": route.get("name"), "is_poc": route.get("is_poc")},
            }
        )
    for voxel in query_result["voxels"]:
        if "footprint" not in voxel:
            # 実APIのground_feature_voxelはポリゴンを返さないため、GeoJSON化できない。
            continue
        coords = [[lon, lat] for lat, lon in voxel["footprint"]]
        coords.append(coords[0])
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": {"layer": "building", "id": voxel.get("id"), "source": voxel.get("source")},
            }
        )
    for area in query_result["areas"] + query_result["prohibited"]:
        if "polygon" not in area:
            continue
        coords = [[p["lon"], p["lat"]] for p in area["polygon"]]
        coords.append(coords[0])
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": {
                    "layer": area.get("category", "prohibited"),
                    "name": area.get("name"),
                    "is_poc": area.get("is_poc"),
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}
