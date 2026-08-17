"""改善タスク_秩父市周辺PLATEAU建物レイヤー.md §5「着手前に決めること」の決定事項。

対象範囲の境界は、秩父市の行政界（複雑な形状、山間部を多く含む）には厳密に
対応させず、運用中心から一辺`TARGET_AREA_SQUARE_KM`kmの正方形とする
（ユーザー決定 2026-08-17）。中心点は`config.DEFAULT_CENTER_LAT/LON`
（既存デフォルト地図中心、秩父市街地・既存29件データのmesh `53397062`付近）を流用し、
中心の二重管理を避ける。

3次メッシュ（JIS X0410、基準地域メッシュ、約1km四方）コードの算出は、全国共通の
緯度30秒・経度45秒グリッドに対する行と列の整数インデックスから8桁コードを導出する
方式による。1次メッシュ（緯度40分・経度1度）は緯度80行・経度80列、2次メッシュ
（緯度5分・経度7.5分）は緯度10行・経度10列という、このグリッドの整数倍の階層構造を
持つため、行・列インデックスから一意にコードへ変換できる（既知の対応点
lat=35.9906, lon=139.0836 → row=4318, col=11126 → mesh="53397086"で算出式を検証済み。
既存デフォルト地図中心は既存29件のmesh `53397062`の隣接メッシュに位置しており、
「付近」という既存コメントと整合する）。
"""

from __future__ import annotations

import math

from .config import DEFAULT_CENTER_LAT, DEFAULT_CENTER_LON

# 一辺の長さ（km）。秩父市行政界（約578km2、東西南北ともおおむね20〜30km）に
# 厳密対応させず、運用中心からの正方形で範囲を確定する（ユーザー決定 2026-08-17）。
TARGET_AREA_SQUARE_KM = 20.0

# 緯度1度あたりの概算距離（km）。3次メッシュ（約1km四方）相当の精度で足りるため
# 単純な球体近似を用いる（測地系による数百m程度の差はこの用途では無視できる）。
_KM_PER_DEG_LAT = 111.32

# 3次メッシュの基本単位。1次メッシュ（緯度40分=2400秒、経度1度=3600秒）も
# 2次メッシュ（緯度5分=300秒、経度7.5分=450秒）も、この単位の整数倍のため、
# 階層を経由せず絶対緯度経度から直接3次メッシュの行・列インデックスを求められる。
_LAT_ROW_UNIT_SEC = 30
_LON_COL_UNIT_SEC = 45


def _km_per_deg_lon(lat_deg: float) -> float:
    return _KM_PER_DEG_LAT * math.cos(math.radians(lat_deg))


def target_bbox() -> tuple[float, float, float, float]:
    """対象範囲の(min_lat, max_lat, min_lon, max_lon)を返す。"""
    half_km = TARGET_AREA_SQUARE_KM / 2.0
    dlat = half_km / _KM_PER_DEG_LAT
    dlon = half_km / _km_per_deg_lon(DEFAULT_CENTER_LAT)
    return (
        DEFAULT_CENTER_LAT - dlat,
        DEFAULT_CENTER_LAT + dlat,
        DEFAULT_CENTER_LON - dlon,
        DEFAULT_CENTER_LON + dlon,
    )


def _row_col(lat: float, lon: float) -> tuple[int, int]:
    row = math.floor(lat * 3600 / _LAT_ROW_UNIT_SEC)
    col = math.floor(lon * 3600 / _LON_COL_UNIT_SEC)
    return row, col


def _mesh3_from_row_col(row: int, col: int) -> str:
    p, q_rem = divmod(row, 80)
    q, r = divmod(q_rem, 10)
    u_full, v_rem = divmod(col, 80)
    u = u_full - 100
    v, w = divmod(v_rem, 10)
    if not (0 <= p <= 99 and 0 <= u <= 99):
        raise ValueError(f"1次メッシュのコード表現範囲外です: row={row}, col={col}")
    return f"{p:02d}{u:02d}{q}{v}{r}{w}"


def latlon_to_mesh3(lat: float, lon: float) -> str:
    """緯度経度から3次メッシュコード（8桁）を計算する。"""
    row, col = _row_col(lat, lon)
    return _mesh3_from_row_col(row, col)


def mesh3_codes_in_bbox(min_lat: float, max_lat: float, min_lon: float, max_lon: float) -> list[str]:
    """任意のbboxと交差する3次メッシュコードの一覧を返す（6-5のbbox建物取得用）。"""
    row_min, col_min = _row_col(min_lat, min_lon)
    row_max, col_max = _row_col(max_lat, max_lon)
    codes = {
        _mesh3_from_row_col(row, col)
        for row in range(row_min, row_max + 1)
        for col in range(col_min, col_max + 1)
    }
    return sorted(codes)


def mesh3_bbox(mesh_code: str) -> tuple[float, float, float, float]:
    """3次メッシュコード（8桁）から、そのセル自体の(min_lat, max_lat, min_lon, max_lon)を
    返す（6-2aの土砂災害・土地利用のクリッピング用）。`_mesh3_from_row_col`の逆変換。
    """
    p, u2, q, v, r, w = int(mesh_code[0:2]), int(mesh_code[2:4]), int(mesh_code[4]), int(mesh_code[5]), int(
        mesh_code[6]
    ), int(mesh_code[7])
    row = p * 80 + q * 10 + r
    col = (u2 + 100) * 80 + v * 10 + w
    min_lat = row * _LAT_ROW_UNIT_SEC / 3600
    min_lon = col * _LON_COL_UNIT_SEC / 3600
    max_lat = (row + 1) * _LAT_ROW_UNIT_SEC / 3600
    max_lon = (col + 1) * _LON_COL_UNIT_SEC / 3600
    return min_lat, max_lat, min_lon, max_lon


def mesh2_codes_in_bbox(min_lat: float, max_lat: float, min_lon: float, max_lon: float) -> list[str]:
    """任意のbboxと交差する2次メッシュコード（6桁）の一覧を返す（6-2aの土砂災害・
    土地利用向け。両レイヤはPLATEAU側で2次メッシュ単位にファイルが分割されている）。

    3次メッシュコードの先頭6桁がそのまま2次メッシュコードになる
    （`_mesh3_from_row_col`のp,u,q,vの4要素がそれぞれ2次メッシュの構成要素と一致する
    ため）。2次メッシュ用に別の行・列インデックス計算を持つ必要はない。
    """
    return sorted({code[:6] for code in mesh3_codes_in_bbox(min_lat, max_lat, min_lon, max_lon)})


def target_mesh_codes() -> list[str]:
    """対象範囲（正方形bbox）と交差する3次メッシュコードの一覧を返す。"""
    return mesh3_codes_in_bbox(*target_bbox())


# 起動時に一度だけ計算する。設定ファイルとしての実体はTARGET_AREA_SQUARE_KMと
# config.DEFAULT_CENTER_LAT/LONであり、これは両者から一意に導かれる派生値。
TARGET_MESH_CODES: list[str] = target_mesh_codes()
