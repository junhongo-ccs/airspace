"""6-5: 地図表示範囲（bbox）に対応した建物データの読み込み。

`scripts/plateau/extract_buildings.py`が生成した
`viewer/src/data/plateau/bldg/{メッシュコード}.geojson`（3次メッシュ単位、建物が
存在しないメッシュにはファイル自体が無い）を、要求されたbboxと交差する3次メッシュ
分だけ読み込んで結合する。`target_area.TARGET_MESH_CODES`（対象範囲）外のメッシュを
要求された場合も、単にファイルが存在しないため0件を返す（エラーにしない）。
"""

from __future__ import annotations

import json
from pathlib import Path

from .target_area import mesh3_codes_in_bbox

_BLDG_DIR = Path(__file__).parent / "data" / "plateau" / "bldg"

# 1回のリクエストで読み込むメッシュ数の上限。対象範囲全体（418メッシュ）でも
# 建物ファイルがあるのは75件のみだが、表示範囲の指定ミス（極端に広いbbox）で
# 毎回全メッシュを読みにいく事態を避けるための安全弁。
MAX_MESHES_PER_REQUEST = 200


class BboxTooLargeError(ValueError):
    pass


def get_buildings_in_bbox(min_lat: float, max_lat: float, min_lon: float, max_lon: float) -> list[dict]:
    """bboxと交差する3次メッシュの建物GeoJSON Featureを結合して返す。"""
    if min_lat > max_lat or min_lon > max_lon:
        raise ValueError("min_lat/min_lonはmax_lat/max_lonを超えられません")

    mesh_codes = mesh3_codes_in_bbox(min_lat, max_lat, min_lon, max_lon)
    if len(mesh_codes) > MAX_MESHES_PER_REQUEST:
        raise BboxTooLargeError(
            f"表示範囲が広すぎます（{len(mesh_codes)}メッシュ、上限{MAX_MESHES_PER_REQUEST}）"
        )

    features: list[dict] = []
    for mesh_code in mesh_codes:
        path = _BLDG_DIR / f"{mesh_code}.geojson"
        if not path.exists():
            continue
        collection = json.loads(path.read_text(encoding="utf-8"))
        features.extend(collection["features"])
    return features
