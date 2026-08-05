"""空間ID／ボクセル解像度のプレースホルダ計算。

仕様書§12「未決定事項」に「空間ID・ボクセル：ID仕様、座標系、単位、高度基準、解像度を
確認する」とある通り、実際の算出方式は未確定である。本実装は `SpatialId`
（airway-digitaltwin-db）と疎通できるまでのプレースホルダであり、実仕様確定後は
compute_placeholder_space_id の中身のみを差し替える想定。
"""

import hashlib

# 仕様書§12で未確定。暫定表示用の値。
PLACEHOLDER_RESOLUTION_M = 1000


def compute_placeholder_space_id(lat: float, lon: float, agl_m: float) -> str:
    digest = hashlib.sha1(f"{lat:.6f},{lon:.6f},{agl_m}".encode()).hexdigest()[:12]
    return f"PLACEHOLDER-{digest}"
