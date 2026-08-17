"""改善タスク_秩父市周辺PLATEAU建物レイヤー.md 6-2: 建物データの再抽出。

PLATEAU秩父市2025のCityGML ZIP（580MB、G空間情報センター
https://www.geospatial.jp/ckan/dataset/plateau-11207-chichibu-shi-2025 で配布）から、
`viewer.src.target_area.TARGET_MESH_CODES`（秩父市街地中心の20km四方、6-1で確定）に
含まれる3次メッシュの`udx/bldg/*.gml`だけをHTTP Rangeリクエストで部分取得し、
建物ID（`gml:id`、CityGML側の安定した識別子）・LOD0外形（`lod0RoofEdge`）・
`measuredHeight`を抽出して3次メッシュ単位のGeoJSONに変換する。

ZIP全体はダウンロードしない（`remote_zip.py`参照）。2026-08-06の進捗ログに記録された
単一メッシュ（53397062）向けの手動抽出を、対象メッシュ全域へ一般化したもの。

欠測高さは実データ上`-9999`のセンチネル値として現れる（2026-08-17、対象範囲75メッシュ
46,165件中8,495件・約18%で確認）。6-3の方針どおりnull（高さ不明）として扱う。

実行方法:
    python scripts/plateau/extract_buildings.py

出力: viewer/src/data/plateau/bldg/{メッシュコード}.geojson（1メッシュ1ファイル）
      建物が存在しないメッシュにはファイルを作らない（配信側は「ファイルなし=0件」として扱う）。
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

from viewer.src.target_area import TARGET_MESH_CODES  # noqa: E402

from remote_zip import build_remote_zip_index, fetch_entry_bytes  # noqa: E402

CITYGML_ZIP_URL = (
    "https://assets.cms.plateau.reearth.io/assets/e1/b32d5f-ac42-4810-a3e0-708f85284349/"
    "11207_chichibu-shi_pref_2025_citygml_1_op.zip"
)
# ZIPの正確なサイズ。Content-Lengthから取得（2026-08-17確認）。HEADで再取得してもよいが、
# 中央ディレクトリの部分取得にはEOCD探索の起点としてサイズが必要なため固定値を持つ。
CITYGML_ZIP_SIZE = 580_626_123

_BLDG_NS = "http://www.opengis.net/citygml/building/2.0"
_GML_NS = "http://www.opengis.net/gml"
_BLDG_FILE_PATTERN = re.compile(r"^udx/bldg/(\d{8})_bldg_6697_op\.gml$")

# CityGML実データで確認済みの欠測高さセンチネル（2026-08-17）。
HEIGHT_UNKNOWN_SENTINEL_MAX = -9000.0

_OUTPUT_DIR = _REPO_ROOT / "viewer" / "src" / "data" / "plateau" / "bldg"


# 小数点以下7桁（赤道上で約1.1cm）に丸める。元データはdouble精度の丸め誤差込みで
# 15桁前後の意味のない精度を持っており、そのまま出力すると座標1点あたり十数バイト
# 無駄になる（2026-08-17、土地利用・洪水浸水の抽出で出力サイズが肥大化したため導入）。
_COORD_DECIMALS = 7


def _parse_pos_list_ring(pos_list_text: str) -> list[list[float]]:
    """`gml:posList`（"lat lon z lat lon z ..."）をGeoJSON用[[lon, lat], ...]へ変換する。

    LOD0外形のz座標は常に0.0固定（altitude.pyの既存知見どおり、地盤標高としては使えない）
    ため保持しない。水平座標系の扱いはaltitude.pyの既存方針（JGD2011とWGS84の差はPoCでは
    無視できる）を踏襲する。
    """
    values = [float(v) for v in pos_list_text.split()]
    ring = []
    for i in range(0, len(values), 3):
        lat, lon = values[i], values[i + 1]
        ring.append([round(lon, _COORD_DECIMALS), round(lat, _COORD_DECIMALS)])
    return ring


def _extract_building_geometry(building: ET.Element) -> dict | None:
    """`lod0RoofEdge`から GeoJSON Polygon/MultiPolygon geometry を作る。

    通常は面（`gml:surfaceMember`）が1つだが、離れた複数の面を持つ建物（渡り廊下で
    繋がった別棟等）にも対応できるよう、複数ある場合はMultiPolygonにする。
    """
    roof_edge = building.find(f"{{{_BLDG_NS}}}lod0RoofEdge")
    if roof_edge is None:
        return None
    pos_lists = roof_edge.findall(f".//{{{_GML_NS}}}posList")
    if not pos_lists:
        return None
    rings = [_parse_pos_list_ring(pl.text) for pl in pos_lists if pl.text]
    if not rings:
        return None
    if len(rings) == 1:
        return {"type": "Polygon", "coordinates": [rings[0]]}
    return {"type": "MultiPolygon", "coordinates": [[ring] for ring in rings]}


def _extract_height_m(building: ET.Element) -> float | None:
    mh = building.find(f"{{{_BLDG_NS}}}measuredHeight")
    if mh is None or mh.text is None:
        return None
    height = float(mh.text)
    if height <= HEIGHT_UNKNOWN_SENTINEL_MAX:
        return None
    return height


def _building_to_feature(building: ET.Element) -> dict | None:
    building_id = building.get(f"{{{_GML_NS}}}id")
    geometry = _extract_building_geometry(building)
    if building_id is None or geometry is None:
        return None
    return {
        "type": "Feature",
        "id": building_id,
        "geometry": geometry,
        "properties": {
            "layer": "building",
            "height_m": _extract_height_m(building),
        },
    }


def extract_mesh_geojson(gml_bytes: bytes, mesh_code: str) -> dict:
    root = ET.fromstring(gml_bytes)
    features = []
    for building in root.iter(f"{{{_BLDG_NS}}}Building"):
        feature = _building_to_feature(building)
        if feature is not None:
            features.append(feature)
    return {
        "type": "FeatureCollection",
        "properties": {
            "mesh_code": mesh_code,
            "source": "PLATEAU秩父市2025",
            "layer": "building",
        },
        "features": features,
    }


def main() -> None:
    target_codes = set(TARGET_MESH_CODES)
    print(f"target mesh codes: {len(target_codes)}")

    index = build_remote_zip_index(CITYGML_ZIP_URL, CITYGML_ZIP_SIZE)
    targets = []
    for info in index.infolist:
        m = _BLDG_FILE_PATTERN.match(info.filename)
        if m and m.group(1) in target_codes:
            targets.append((m.group(1), info))
    print(f"bldg files within target: {len(targets)}")

    _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total_buildings = 0
    total_height_unknown = 0
    written_files = 0
    t0 = time.time()
    for i, (mesh_code, info) in enumerate(targets):
        gml_bytes = fetch_entry_bytes(CITYGML_ZIP_URL, info)
        collection = extract_mesh_geojson(gml_bytes, mesh_code)
        if collection["features"]:
            out_path = _OUTPUT_DIR / f"{mesh_code}.geojson"
            out_path.write_text(
                json.dumps(collection, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            written_files += 1
        total_buildings += len(collection["features"])
        total_height_unknown += sum(1 for f in collection["features"] if f["properties"]["height_m"] is None)
        if (i + 1) % 15 == 0 or (i + 1) == len(targets):
            print(f"...{i + 1}/{len(targets)} files, buildings so far: {total_buildings}, elapsed {time.time() - t0:.1f}s")

    print("=== summary ===")
    print(f"mesh files written: {written_files}")
    print(f"total buildings: {total_buildings}")
    print(f"height unknown (sentinel/missing): {total_height_unknown}")
    total_bytes = sum(p.stat().st_size for p in _OUTPUT_DIR.glob("*.geojson"))
    print(f"output size: {total_bytes / 1_000_000:.1f} MB across {written_files} files")


if __name__ == "__main__":
    main()
