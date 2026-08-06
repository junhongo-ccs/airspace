"""仕様書§5-3: 高度基準の統一。

前提条件（§5-3の1〜3）の記録:

1. 座標参照系・単位・時点
   - PLATEAU建物（LOD0フットプリント・LOD1 measuredHeight）: 元CityGMLの
     `gml:Envelope`は`srsName="http://www.opengis.net/def/crs/EPSG/0/6697"`を
     宣言している（実ファイルで確認済み、2026-08-06）。EPSG:6697は
     「JGD2011 + JGD2011（vertical）height」の複合座標系であり、鉛直方向は
     国土地理院が地理院DEM等でも用いる標高（ジオイド補正済み・楕円体高ではない）。
   - `measuredHeight`（建物高さ）はCityGML Building móduleの定義上、地盤面から
     建物最高点までの相対高さ（m）。絶対標高ではない。
   - AGL入力（Streamlit左パネル）も定義上「地上高」＝地盤面からの相対高さ（m）。
   - 水平座標系: Streamlit入力はWGS84（一般的なウェブ地図の慣例）、PLATEAU側は
     JGD2011。日本国内では両者の差はメートル未満で、ズーム17タイル1マスの
     一辺（本POC対象緯度でおよそ1.5m）と比べて無視できるためPoCでは変換しない。

2. 変換式・ジオイドモデル
   - 建物側measuredHeightとAGL入力は、どちらも「地盤面からの相対高さ」という
     同じ定義を共有しているため、絶対標高（海抜等）への変換やジオイドモデルの
     適用は本比較には不要と判断した。地理院DEM等の絶対標高データとの混在比較は
     仕様書§5-3の方針どおり行わない（表示・品質確認用途に限定）。

3. 既知地点での比較・許容差の定義
   - PLATEAU秩父市2025のLOD0フットプリント（lod0RoofEdge）のz座標は、取得した
     29件全件で0.0固定であり（実データ確認済み）、実測の地盤標高としては使えない
     （簡易な2次元相当表現と判断）。そのため実測誤差からの許容差算出はできず、
     ドローン運用で一般的に用いられる安全マージンを暫定許容差として採用した。
   - 暫定許容差 AGL_TOLERANCE_M = 2.0m。実運用前には実測（既知地点でのGPS高度・
     RTK測量等）による検証が必要（本PoCでは未実施であることを明記する）。

以上の記録により、**建物レイヤに限り**、AGL入力とmeasuredHeightの比較を
「検証済み（暫定許容差付き）」として有効化する。建物以外のレイヤ（道路・
土砂災害・洪水浸水・土地利用・注意区域・禁止区域）は高さ情報を保持しないため、
引き続き「未検証（高さ情報なし）」のままとする。
"""

from __future__ import annotations

import json
import re
from pathlib import Path

AGL_TOLERANCE_M = 2.0

_HEIGHTS_PATH = Path(__file__).parent / "data" / "plateau_building_heights.json"
_VOXEL_FILE_PATTERN = re.compile(r"plateau/[^/]+/([^/]+)\.json")


def _load_building_heights() -> dict[str, float | None]:
    with open(_HEIGHTS_PATH, encoding="utf-8") as f:
        return json.load(f)


_BUILDING_HEIGHTS = _load_building_heights()


def extract_building_id(voxel_bit_file_path: str | None) -> str | None:
    """voxelBitFileName（`.../plateau/{mesh}/{buildingId}.json`）からbuildingIdを取り出す。"""
    if not voxel_bit_file_path:
        return None
    m = _VOXEL_FILE_PATTERN.search(voxel_bit_file_path)
    return m.group(1) if m else None


def lookup_building_height(building_id: str | None) -> float | None:
    if building_id is None:
        return None
    return _BUILDING_HEIGHTS.get(building_id)


def evaluate_building_vertical(height_m: float | None, agl_m: float | None) -> str:
    """建物のmeasuredHeightとAGLを比較し、交差・詳細表の「交差判定」文言を返す。

    height_mがNone（欠測値センチネル含む）またはagl_mがNoneの場合は判定不能。
    """
    if height_m is None or agl_m is None:
        return "未検証（高さ情報なし）"
    if agl_m <= height_m + AGL_TOLERANCE_M:
        return f"要確認（高さ方向・建物高{height_m:.1f}m・暫定許容差±{AGL_TOLERANCE_M:.0f}m）"
    return f"交差なし（高さ方向・建物高{height_m:.1f}m・暫定許容差±{AGL_TOLERANCE_M:.0f}m）"
