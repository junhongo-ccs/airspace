"""空間ID計算。

仕様書§12「未決定事項」は「空間ID・ボクセル：ID仕様、座標系、単位、高度基準、解像度を
確認する」としていたが、Drone-web実コード（ApiFunction::get_spatial_xy_on_point、
airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/ApiFunction.php）を
確認した結果、水平方向のID形式は判明した：`"{zoom}/0/{x}/{y}"`という、Web Mercator
スライッピーマップタイル方式（OSM等と同じXYZタイル座標）。ズームレベルは17固定で
使われている（GroundFeatureVoxelController等）。

ただし高度方向の扱い（AGLとの対応、ボクセルの鉛直分割）は実コードからは未確認のまま。
仕様書§5-3の高度基準統一が完了するまで、この空間IDを高度比較には使用しない。
"""

import math

# 実コード確認済み（GroundFeatureVoxelController等が17固定で使用）
DEFAULT_ZOOM_LEVEL = 17


def compute_real_spatial_id(lon: float, lat: float, zoom: int = DEFAULT_ZOOM_LEVEL) -> str:
    """ApiFunction::get_spatial_xy_on_pointのPython移植。"z/0/x/y"形式の空間ID文字列を返す。"""
    if lon == 180:
        lon = -180.0
    p = 2.0**zoom
    x = int(math.floor(p * ((lon + 180.0) / 360.0)))
    y = int(
        math.floor(
            p * (1.0 - math.log(math.tan(math.radians(lat)) + (1.0 / math.cos(math.radians(lat)))) / math.pi) / 2.0
        )
    )
    return f"{zoom}/0/{x}/{y}"
