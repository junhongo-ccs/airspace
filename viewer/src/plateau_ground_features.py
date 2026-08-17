"""6-6a: 地図表示範囲（bbox）に対応した道路・土砂災害・洪水浸水・土地利用の読み込み。

`plateau_buildings.py`（6-5、建物）と同じ考え方。`scripts/plateau/extract_ground_features.py`
が3次メッシュ単位で生成した`viewer/src/data/plateau/{layer}/{メッシュコード}.geojson`を、
要求bboxと交差するメッシュ分だけ読み込んで結合する。土砂災害・土地利用も元データは
2次メッシュ単位だが、抽出時に3次メッシュ境界へクリップ済みのため、建物・道路・
洪水浸水と同じ粒度で扱える。
"""

from __future__ import annotations

import json
from pathlib import Path

from .target_area import mesh3_codes_in_bbox

_DATA_ROOT = Path(__file__).parent / "data" / "plateau"

# BFF上のレイヤー名からデータディレクトリ名への対応。建物は`plateau_buildings.py`
# （専用の高さ判定ロジックを持つ）が別に担当するため、ここには含めない。
_LAYER_DIRS = {
    "road": "road",
    "landslide": "landslide",
    "flood": "flood",
    "landuse": "landuse",
}

# plateau_buildings.pyと同じ安全弁。
MAX_MESHES_PER_REQUEST = 200


class UnknownLayerError(ValueError):
    pass


class BboxTooLargeError(ValueError):
    pass


def get_ground_features_in_bbox(
    layer: str, min_lat: float, max_lat: float, min_lon: float, max_lon: float
) -> list[dict]:
    """bboxと交差する3次メッシュの指定レイヤーGeoJSON Featureを結合して返す。"""
    if layer not in _LAYER_DIRS:
        raise UnknownLayerError(f"未知のレイヤーです: {layer}（road/landslide/flood/landuseのいずれか）")
    if min_lat > max_lat or min_lon > max_lon:
        raise ValueError("min_lat/min_lonはmax_lat/max_lonを超えられません")

    mesh_codes = mesh3_codes_in_bbox(min_lat, max_lat, min_lon, max_lon)
    if len(mesh_codes) > MAX_MESHES_PER_REQUEST:
        raise BboxTooLargeError(
            f"表示範囲が広すぎます（{len(mesh_codes)}メッシュ、上限{MAX_MESHES_PER_REQUEST}）"
        )

    layer_dir = _DATA_ROOT / _LAYER_DIRS[layer]
    features: list[dict] = []
    for mesh_code in mesh_codes:
        path = layer_dir / f"{mesh_code}.geojson"
        if not path.exists():
            continue
        collection = json.loads(path.read_text(encoding="utf-8"))
        features.extend(collection["features"])
    return features
