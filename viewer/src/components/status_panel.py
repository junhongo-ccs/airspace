"""design.md §9-1〜§9-3: API接続状態／空間ID表示／評価状態（高度基準）／PoC識別バッジ。"""

import streamlit as st

from ..config import ENVIRONMENT
from ..spatial_id import DEFAULT_ZOOM_LEVEL, compute_real_spatial_id
from ..theme import poc_badge_html, status_badge_html

_CONNECTION_LABEL = {"connected": "Connected", "disconnected": "Disconnected", "error": "Error"}
_CONNECTION_CSS_STATE = {"connected": "ok", "disconnected": "idle", "error": "error"}


def render_connection_status(state: str, mock: bool) -> None:
    """design.md §9-1: 左設定パネル最上部に常時表示。色だけに依存せず状態文字列を併記する。"""
    label = _CONNECTION_LABEL[state]
    if mock:
        label += "（mock）"
    st.markdown(
        status_badge_html(f"● {label}", _CONNECTION_CSS_STATE[state]),
        unsafe_allow_html=True,
    )


def render_space_id(start: tuple | None, agl_m: float | None) -> tuple[str | None, float | None]:
    """design.md §9-1: 対象空間ID／ボクセル解像度を表示する。ユーザー入力ではなく、
    始点・終点・AGLから算出した値を表示する（仕様書§8）。

    水平方向のID形式は実コード確認済み（ApiFunction::get_spatial_xy_on_point、
    spatial_id.py参照）。ズームレベル17固定のWeb Mercatorタイル形式。
    高度（AGL）を空間IDへどう反映するかは実コードからは未確認のため、
    現状はAGLをID計算に使わず、別表示に留める（仕様書§5-3が完了するまで
    高度方向の対応関係を主張しない）。

    戻り値: (space_id, resolution_m) — 未算出の場合は (None, None)。resolution_m は
    現時点では未確認のため None を返す。
    """
    if start is None or agl_m is None:
        st.caption("対象空間ID：未算出（始点・AGLを入力してください）")
        return None, None

    space_id = compute_real_spatial_id(lon=start[1], lat=start[0], zoom=DEFAULT_ZOOM_LEVEL)
    st.markdown(
        f'<span class="mono caption-text">空間ID: {space_id}（ズーム{DEFAULT_ZOOM_LEVEL}固定・水平方向のみ）'
        f"／ AGL {agl_m}m（建物との垂直比較にのみ使用。空間ID自体は高度方向を含まない）</span>",
        unsafe_allow_html=True,
    )
    return space_id, None


def render_altitude_verification_status() -> None:
    """design.md §9-2: 仕様書§5-3の高度基準統一と受入基準#9に対応する。

    §5-3の前提条件（座標参照系の記録、変換式の登録、既知地点での比較、許容差の定義）は
    **建物レイヤに限り**記録・整理できたため（altitude.py参照）、建物のみAGL入力と
    measuredHeightの垂直方向比較を有効化した（暫定許容差±2m）。建物以外のレイヤ
    （道路・土砂災害・洪水浸水・土地利用・注意区域・禁止区域）は高さ情報を保持しないため、
    引き続き「未検証」のままとする。
    """
    st.markdown(
        status_badge_html("△ 高度比較：建物のみ検証済み（暫定許容差±2m）／他レイヤは未検証", "warn"),
        unsafe_allow_html=True,
    )
    st.caption(
        "仕様書§5-3に基づき、建物のみAGL入力とPLATEAU measuredHeight（地盤基準相対高）を"
        "比較する。暫定許容差±2mは実測未検証のPoC上の仮定値。建物以外のレイヤは高さ情報が"
        "無いため「未検証」のまま、垂直方向の交差・離隔判定は出力しない。"
    )


def render_poc_badge() -> None:
    """design.md §9-3: 画面右上に常時表示（仕様書§6-1）。"""
    st.markdown(poc_badge_html(ENVIRONMENT), unsafe_allow_html=True)
