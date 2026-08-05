"""design.md §9-1〜§9-3: API接続状態／空間ID表示／評価状態（高度基準）／PoC識別バッジ。"""

import streamlit as st

from ..config import ENVIRONMENT
from ..spatial_id import PLACEHOLDER_RESOLUTION_M, compute_placeholder_space_id
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

    戻り値: (space_id, resolution_m) — 未算出の場合は (None, None)。
    """
    if start is None or agl_m is None:
        st.caption("対象空間ID／ボクセル解像度：未算出（始点・AGLを入力してください）")
        return None, None

    space_id = compute_placeholder_space_id(start[0], start[1], agl_m)
    resolution_m = PLACEHOLDER_RESOLUTION_M
    st.markdown(
        f'<span class="mono caption-text">空間ID: {space_id} ／ 解像度: {resolution_m} m'
        f"（プレースホルダ。仕様書§12の空間ID仕様確定後に置き換え）</span>",
        unsafe_allow_html=True,
    )
    return space_id, resolution_m


def render_altitude_verification_status() -> None:
    """design.md §9-2: 仕様書§5-3の高度基準統一と受入基準#9に対応する。

    §5-3の前提条件（座標参照系の記録、変換式の登録、既知地点での比較、許容差の定義）が
    完了するまでは常に「未検証」を表示し、垂直方向の交差・離隔判定は出力しない。
    Phase Bが未実施の現時点では常にこの状態になる。
    """
    st.markdown(
        status_badge_html("▲ 高度比較未検証／垂直判定は出力しません", "warn"),
        unsafe_allow_html=True,
    )
    st.caption(
        "仕様書§5-3の高度基準統一が完了するまで、垂直方向の交差・離隔判定は「未検証」と"
        "表示され、判定結果は出力されません。"
    )


def render_poc_badge() -> None:
    """design.md §9-3: 画面右上に常時表示（仕様書§6-1）。"""
    st.markdown(poc_badge_html(ENVIRONMENT), unsafe_allow_html=True)
