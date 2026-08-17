"""改善タスク_秩父市周辺PLATEAU建物レイヤー.md 6-2a: 道路・土砂災害・洪水浸水・
土地利用データの再抽出。

`extract_buildings.py`（6-2、建物）と同じ方式（ZIP全体をダウンロードせず対象
メッシュのファイルだけHTTP Rangeで部分取得）を、他の4レイヤへ一般化したもの。

レイヤごとにPLATEAU側のファイル分割単位・要素・分類属性が異なる（2026-08-17に
実データで確認）:

  - 道路（tran）  : 3次メッシュ単位。`tran:Road`。分類は`tran:class`
                    （codelist: TransportationComplex_class）。
  - 土砂災害（lsld）: 2次メッシュ単位。`urf:SedimentDisasterProneArea`。分類は
                    `urf:disasterType`（codelist: LandSlideRiskAttribute_description、
                    例: 急傾斜地の崩落/土石流/地すべり）。`urf:status`
                    （codelist: LandSlideRiskAttribute_status）も付与する。
  - 洪水浸水（fld） : 3次メッシュ単位、`udx/fld/pref/{河川名フォルダ}/`配下に
                    l1（計画規模）・l2（想定最大規模）の2ファイルがある。要素は
                    `wtr:WaterBody`＋`uro:floodingRiskAttribute`拡張。分類は
                    `uro:rank`（codelist: RiverFloodingRiskAttribute_rank、
                    浸水深）。シナリオ区分は`uro:scale`
                    （codelist: RiverFloodingRiskAttribute_scale）を使う
                    （ファイル名のl1/l2と一致することを確認済み）。
  - 土地利用（luse） : 2次メッシュ単位。`luse:LandUse`。分類は`luse:class`
                    （codelist: Common_landUseType）。

いずれも、ランダムUUIDではなくCityGML側の`gml:id`（安定した元データID）を保持する
（改善タスク6-2a本文の要求）。

実行方法:
    python scripts/plateau/extract_ground_features.py
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from xml.etree import ElementTree as ET

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_REPO_ROOT))

from viewer.src.target_area import mesh2_codes_in_bbox, mesh3_bbox, mesh3_codes_in_bbox, target_bbox  # noqa: E402

from codelists import load_codelist  # noqa: E402
from remote_zip import RemoteZipIndex, build_remote_zip_index, fetch_entry_bytes  # noqa: E402

CITYGML_ZIP_URL = (
    "https://assets.cms.plateau.reearth.io/assets/e1/b32d5f-ac42-4810-a3e0-708f85284349/"
    "11207_chichibu-shi_pref_2025_citygml_1_op.zip"
)
CITYGML_ZIP_SIZE = 580_626_123

_GML_NS = "http://www.opengis.net/gml"
_TRAN_NS = "http://www.opengis.net/citygml/transportation/2.0"
_LUSE_NS = "http://www.opengis.net/citygml/landuse/2.0"
_WTR_NS = "http://www.opengis.net/citygml/waterbody/2.0"
_URF_NS = "https://www.geospatial.jp/iur/urf/3.2"
_URO_NS = "https://www.geospatial.jp/iur/uro/3.2"

_OUTPUT_ROOT = _REPO_ROOT / "viewer" / "src" / "data" / "plateau"


# extract_buildings.pyと同じ理由・同じ桁数（赤道上で約1.1cm）で丸める。
_COORD_DECIMALS = 7


def _parse_pos_list_ring(pos_list_text: str) -> list[list[float]]:
    """`gml:posList`（"lat lon z lat lon z ..."）をGeoJSON用[[lon, lat], ...]へ変換する。

    `extract_buildings.py`の同名処理と同じ考え方（z座標は地盤標高として使えない
    ため保持しない、水平座標系の差はPoCでは無視できる）。
    """
    values = [float(v) for v in pos_list_text.split()]
    return [
        [round(values[i + 1], _COORD_DECIMALS), round(values[i], _COORD_DECIMALS)]
        for i in range(0, len(values), 3)
    ]


def _geometry_from_multisurface(multi_surface_prop: ET.Element | None) -> dict | None:
    """`*:lod1MultiSurface`要素からGeoJSON Polygon/MultiPolygon geometryを作る。"""
    if multi_surface_prop is None:
        return None
    pos_lists = multi_surface_prop.findall(f".//{{{_GML_NS}}}posList")
    rings = [_parse_pos_list_ring(pl.text) for pl in pos_lists if pl.text]
    if not rings:
        return None
    if len(rings) == 1:
        return {"type": "Polygon", "coordinates": [rings[0]]}
    return {"type": "MultiPolygon", "coordinates": [[ring] for ring in rings]}


def _lerp_at_x(a: list[float], b: list[float], x: float) -> list[float]:
    t = (x - a[0]) / (b[0] - a[0]) if b[0] != a[0] else 0.0
    return [x, a[1] + t * (b[1] - a[1])]


def _lerp_at_y(a: list[float], b: list[float], y: float) -> list[float]:
    t = (y - a[1]) / (b[1] - a[1]) if b[1] != a[1] else 0.0
    return [a[0] + t * (b[0] - a[0]), y]


def _clip_edge(points: list[list[float]], inside, intersect) -> list[list[float]]:
    if not points:
        return []
    result = []
    prev = points[-1]
    prev_inside = inside(prev)
    for curr in points:
        curr_inside = inside(curr)
        if curr_inside:
            if not prev_inside:
                result.append(intersect(prev, curr))
            result.append(curr)
        elif prev_inside:
            result.append(intersect(prev, curr))
        prev, prev_inside = curr, curr_inside
    return result


def clip_ring_to_bbox(
    ring: list[list[float]], min_lon: float, max_lon: float, min_lat: float, max_lat: float
) -> list[list[float]] | None:
    """Sutherland-Hodgmanで[lon, lat]の閉じたリングを矩形へクリップする。

    土地利用・土砂災害は元データが2次メッシュ（10km四方）単位のため、そのまま
    3次メッシュ単位で配信すると1ファイルが最大20MB超になった（2026-08-17実測）。
    表示範囲bboxで読むファイル数を絞れる粒度（3次メッシュ、約1km四方）に合わせて
    ポリゴンをメッシュ境界で切断し、各セルには重なる部分だけを保存する
    （ユーザー決定 2026-08-17）。矩形クリップなので凸性を問わず正しく動作する。
    """
    points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else list(ring)
    points = _clip_edge(points, lambda p: p[0] >= min_lon, lambda a, b: _lerp_at_x(a, b, min_lon))
    points = _clip_edge(points, lambda p: p[0] <= max_lon, lambda a, b: _lerp_at_x(a, b, max_lon))
    points = _clip_edge(points, lambda p: p[1] >= min_lat, lambda a, b: _lerp_at_y(a, b, min_lat))
    points = _clip_edge(points, lambda p: p[1] <= max_lat, lambda a, b: _lerp_at_y(a, b, max_lat))
    if len(points) < 3:
        return None
    points.append(points[0])
    return points


def clip_geometry_by_mesh3(geometry: dict, candidate_mesh_codes: list[str]) -> dict[str, dict]:
    """PolygonまたはMultiPolygon geometryを、候補の3次メッシュコードそれぞれの
    セル境界でクリップする。重なりが無いメッシュは結果に含めない。

    元がMultiPolygon（複数の離れた面）の場合、各面を独立にクリップし、同じ
    メッシュに複数の面が残ればそのメッシュの結果もMultiPolygonにする。
    """
    source_rings = geometry["coordinates"] if geometry["type"] == "Polygon" else [g[0] for g in geometry["coordinates"]]
    by_mesh: dict[str, list[list[list[float]]]] = {}
    for mesh_code in candidate_mesh_codes:
        min_lat, max_lat, min_lon, max_lon = mesh3_bbox(mesh_code)
        clipped_rings = []
        for ring in source_rings:
            clipped = clip_ring_to_bbox(ring, min_lon, max_lon, min_lat, max_lat)
            if clipped is not None:
                clipped_rings.append(clipped)
        if clipped_rings:
            by_mesh[mesh_code] = clipped_rings

    result = {}
    for mesh_code, rings in by_mesh.items():
        if len(rings) == 1:
            result[mesh_code] = {"type": "Polygon", "coordinates": [rings[0]]}
        else:
            result[mesh_code] = {"type": "MultiPolygon", "coordinates": [[ring] for ring in rings]}
    return result


def _write_mesh_geojson(layer_dir: Path, mesh_code: str, features: list[dict], layer: str) -> None:
    layer_dir.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "properties": {"mesh_code": mesh_code, "source": "PLATEAU秩父市2025", "layer": layer},
        "features": features,
    }
    (layer_dir / f"{mesh_code}.geojson").write_text(
        json.dumps(collection, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )


def _fetch_targets(index: RemoteZipIndex, pattern: re.Pattern, target_codes: set[str]) -> list[tuple[str, object]]:
    targets = []
    for info in index.infolist:
        m = pattern.match(info.filename)
        if m and m.group(1) in target_codes:
            targets.append((m.group(1), info))
    return targets


def extract_roads(index: RemoteZipIndex, target_codes: set[str]) -> dict:
    class_labels = load_codelist(CITYGML_ZIP_URL, index, "TransportationComplex_class")
    pattern = re.compile(r"^udx/tran/(\d{8})_tran_6697_op\.gml$")
    targets = _fetch_targets(index, pattern, target_codes)
    print(f"road: {len(targets)} mesh files")

    out_dir = _OUTPUT_ROOT / "road"
    total = 0
    for mesh_code, info in targets:
        gml_bytes = fetch_entry_bytes(CITYGML_ZIP_URL, info)
        root = ET.fromstring(gml_bytes)
        features = []
        for road in root.iter(f"{{{_TRAN_NS}}}Road"):
            road_id = road.get(f"{{{_GML_NS}}}id")
            geometry = _geometry_from_multisurface(road.find(f"{{{_TRAN_NS}}}lod1MultiSurface"))
            if road_id is None or geometry is None:
                continue
            class_code_el = road.find(f"{{{_TRAN_NS}}}class")
            class_code = class_code_el.text if class_code_el is not None else None
            features.append(
                {
                    "type": "Feature",
                    "id": road_id,
                    "geometry": geometry,
                    "properties": {
                        "layer": "road",
                        "class_code": class_code,
                        "class_label": class_labels.get(class_code) if class_code else None,
                    },
                }
            )
        if features:
            _write_mesh_geojson(out_dir, mesh_code, features, "road")
        total += len(features)
    print(f"road: {total} features written")
    return {"layer": "road", "features": total, "meshes": len(targets)}


def _clip_and_collect(
    feature_id: str,
    geometry: dict,
    properties: dict,
    target_codes8: set[str],
    by_mesh3: dict[str, list[dict]],
) -> None:
    """geometryを、この2次メッシュ配下で対象範囲内の3次メッシュへクリップし、
    メッシュごとのfeatureリストへ追加する（landuse/landslide共通処理）。
    """
    clipped_by_mesh = clip_geometry_by_mesh3(geometry, list(target_codes8))
    for mesh_code, clipped_geometry in clipped_by_mesh.items():
        by_mesh3.setdefault(mesh_code, []).append(
            {"type": "Feature", "id": feature_id, "geometry": clipped_geometry, "properties": properties}
        )


def extract_landuse(index: RemoteZipIndex, target_codes6: set[str], target_codes8: set[str]) -> dict:
    class_labels = load_codelist(CITYGML_ZIP_URL, index, "Common_landUseType")
    pattern = re.compile(r"^udx/luse/(\d{6})_luse_6697_op\.gml$")
    targets = _fetch_targets(index, pattern, target_codes6)
    print(f"landuse: {len(targets)} source (2次メッシュ) files")

    out_dir = _OUTPUT_ROOT / "landuse"
    by_mesh3: dict[str, list[dict]] = {}
    total = 0
    for mesh6, info in targets:
        # このソースファイルが担当する2次メッシュ配下で、対象範囲に入っている
        # 3次メッシュだけをクリップ候補にする（対象範囲外の隅は生成しない）。
        candidates8 = {c for c in target_codes8 if c.startswith(mesh6)}
        gml_bytes = fetch_entry_bytes(CITYGML_ZIP_URL, info)
        root = ET.fromstring(gml_bytes)
        for luse in root.iter(f"{{{_LUSE_NS}}}LandUse"):
            luse_id = luse.get(f"{{{_GML_NS}}}id")
            geometry = _geometry_from_multisurface(luse.find(f"{{{_LUSE_NS}}}lod1MultiSurface"))
            if luse_id is None or geometry is None:
                continue
            class_code_el = luse.find(f"{{{_LUSE_NS}}}class")
            class_code = class_code_el.text if class_code_el is not None else None
            properties = {
                "layer": "landuse",
                "class_code": class_code,
                "class_label": class_labels.get(class_code) if class_code else None,
            }
            total += 1
            _clip_and_collect(luse_id, geometry, properties, candidates8, by_mesh3)

    written = 0
    for mesh_code, features in by_mesh3.items():
        _write_mesh_geojson(out_dir, mesh_code, features, "landuse")
        written += 1
    print(f"landuse: {total} source features, written across {written} 3次メッシュ files")
    return {"layer": "landuse", "source_features": total, "mesh3_files": written}


def extract_landslide(index: RemoteZipIndex, target_codes6: set[str], target_codes8: set[str]) -> dict:
    disaster_type_labels = load_codelist(CITYGML_ZIP_URL, index, "LandSlideRiskAttribute_description")
    status_labels = load_codelist(CITYGML_ZIP_URL, index, "LandSlideRiskAttribute_status")
    pattern = re.compile(r"^udx/lsld/(\d{6})_lsld_6697_op\.gml$")
    targets = _fetch_targets(index, pattern, target_codes6)
    print(f"landslide: {len(targets)} source (2次メッシュ) files")

    out_dir = _OUTPUT_ROOT / "landslide"
    by_mesh3: dict[str, list[dict]] = {}
    total = 0
    for mesh6, info in targets:
        candidates8 = {c for c in target_codes8 if c.startswith(mesh6)}
        gml_bytes = fetch_entry_bytes(CITYGML_ZIP_URL, info)
        root = ET.fromstring(gml_bytes)
        for area in root.iter(f"{{{_URF_NS}}}SedimentDisasterProneArea"):
            area_id = area.get(f"{{{_GML_NS}}}id")
            geometry = _geometry_from_multisurface(area.find(f"{{{_URF_NS}}}lod1MultiSurface"))
            if area_id is None or geometry is None:
                continue
            disaster_type_el = area.find(f"{{{_URF_NS}}}disasterType")
            disaster_type = disaster_type_el.text if disaster_type_el is not None else None
            status_el = area.find(f"{{{_URF_NS}}}status")
            status = status_el.text if status_el is not None else None
            properties = {
                "layer": "landslide",
                # 区域種別（急傾斜地の崩落/土石流/地すべり）。改善タスクの
                # 想定文言「区域種別：急傾斜地の崩壊」に対応する分類。
                "class_code": disaster_type,
                "class_label": disaster_type_labels.get(disaster_type) if disaster_type else None,
                "status_code": status,
                "status_label": status_labels.get(status) if status else None,
            }
            total += 1
            _clip_and_collect(area_id, geometry, properties, candidates8, by_mesh3)

    written = 0
    for mesh_code, features in by_mesh3.items():
        _write_mesh_geojson(out_dir, mesh_code, features, "landslide")
        written += 1
    print(f"landslide: {total} source features, written across {written} 3次メッシュ files")
    return {"layer": "landslide", "source_features": total, "mesh3_files": written}


def extract_flood(index: RemoteZipIndex, target_codes8: set[str]) -> dict:
    rank_labels = load_codelist(CITYGML_ZIP_URL, index, "RiverFloodingRiskAttribute_rank")
    scale_labels = load_codelist(CITYGML_ZIP_URL, index, "RiverFloodingRiskAttribute_scale")
    # 河川名フォルダ名は事前に特定できないため、フォルダ名を問わずメッシュコードと
    # l1/l2だけを見て一致させる。
    pattern = re.compile(r"^udx/fld/pref/[^/]+/(\d{8})_fld_6697_(l1|l2)\.gml$")
    targets = []
    for info in index.infolist:
        m = pattern.match(info.filename)
        if m and m.group(1) in target_codes8:
            targets.append((m.group(1), info))
    print(f"flood: {len(targets)} mesh files (l1/l2合計)")

    out_dir = _OUTPUT_ROOT / "flood"
    # 同じメッシュにl1・l2の2ファイルがあるため、メッシュ単位でfeaturesを蓄積してから書く。
    by_mesh: dict[str, list[dict]] = {}
    for mesh_code, info in targets:
        gml_bytes = fetch_entry_bytes(CITYGML_ZIP_URL, info)
        root = ET.fromstring(gml_bytes)
        for water_body in root.iter(f"{{{_WTR_NS}}}WaterBody"):
            body_id = water_body.get(f"{{{_GML_NS}}}id")
            geometry = _geometry_from_multisurface(water_body.find(f"{{{_WTR_NS}}}lod1MultiSurface"))
            if body_id is None or geometry is None:
                continue
            risk = water_body.find(f"{{{_URO_NS}}}floodingRiskAttribute/{{{_URO_NS}}}RiverFloodingRiskAttribute")
            rank_code = None
            scale_code = None
            if risk is not None:
                rank_el = risk.find(f"{{{_URO_NS}}}rank")
                rank_code = rank_el.text if rank_el is not None else None
                scale_el = risk.find(f"{{{_URO_NS}}}scale")
                scale_code = scale_el.text if scale_el is not None else None
            by_mesh.setdefault(mesh_code, []).append(
                {
                    "type": "Feature",
                    "id": body_id,
                    "geometry": geometry,
                    "properties": {
                        "layer": "flood",
                        # 浸水深ランク（例: 0.5m未満〜20m以上）。
                        "class_code": rank_code,
                        "class_label": rank_labels.get(rank_code) if rank_code else None,
                        # L1（計画規模）/L2（想定最大規模）。ファイル名のl1/l2と一致
                        # することを確認済み（2026-08-17）。
                        "scale_code": scale_code,
                        "scale_label": scale_labels.get(scale_code) if scale_code else None,
                    },
                }
            )

    total = 0
    for mesh_code, features in by_mesh.items():
        _write_mesh_geojson(out_dir, mesh_code, features, "flood")
        total += len(features)
    print(f"flood: {total} features written")
    return {"layer": "flood", "features": total, "meshes": len(by_mesh)}


def main() -> None:
    min_lat, max_lat, min_lon, max_lon = target_bbox()
    target_codes8 = set(mesh3_codes_in_bbox(min_lat, max_lat, min_lon, max_lon))
    target_codes6 = set(mesh2_codes_in_bbox(min_lat, max_lat, min_lon, max_lon))
    print(f"target 3次メッシュ: {len(target_codes8)}, 2次メッシュ: {len(target_codes6)}")

    index = build_remote_zip_index(CITYGML_ZIP_URL, CITYGML_ZIP_SIZE)

    t0 = time.time()
    summaries = [
        extract_roads(index, target_codes8),
        extract_landslide(index, target_codes6, target_codes8),
        extract_flood(index, target_codes8),
        extract_landuse(index, target_codes6, target_codes8),
    ]
    print("=== summary ===")
    for s in summaries:
        print(s)
    print(f"elapsed {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
