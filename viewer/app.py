"""空域デジタルツインGIS Viewer（PoC）

design.md（v1.2）のレイアウト・カラー・タイポグラフィ・状態表示規定と、
`ドローン航路GIS-PoC_仕様書.md`（v0.3）のPhase C機能要件に基づく実装。

Phase A（Drone-web+MySQLのローカルDocker起動）が未実施のため、
API接続は既定でモックモード。左パネルの「モックAPIを使用する」をOFFにすると
実際のAPI接続先へ接続を試みる。
"""

import streamlit as st

from src.access_gate import require_access_code
from src.components import map_view, results_table, status_panel
from src.components.route_form import render_settings_panel
from src.config import APP_TITLE
from src.theme import disclaimer_footer_html, disclaimer_inline_html, inject_theme

st.set_page_config(page_title=APP_TITLE, layout="wide")
inject_theme()

# --- アクセスゲート（仕様書§9: 初期はアクセス制限を掛けた検証環境とする） ---
if not require_access_code():
    st.stop()

# --- 左設定パネル（design.md §4-1） -----------------------------------
ctx = render_settings_panel()

# --- 画面右上: PoC識別バッジ（design.md §9-3） -------------------------
title_col, badge_col = st.columns([5, 1])
with title_col:
    st.markdown(f"# {APP_TITLE}")
with badge_col:
    st.markdown("<br>", unsafe_allow_html=True)
    status_panel.render_poc_badge()

# --- 地図（design.md §7・§8。最重要コンポーネントとして最優先で確保） ---
query_result = st.session_state.get("last_query_result")
map_view.render_map(ctx, query_result)

st.markdown("---")

# --- 下部エリア1：登録・照会結果（design.md §4-1、仕様書§8） -----------
with st.expander("登録・照会結果", expanded=True):
    st.markdown("##### 航路登録")
    results_table.render_registration_result(st.session_state.get("last_register_result"))
    st.markdown("##### 周辺データ照会")
    results_table.render_query_result_summary(query_result)

# --- 下部エリア2：交差・詳細表／ダウンロード（design.md §4-1、仕様書§8） -
with st.expander("交差・情報不足の詳細表／CSV・GeoJSONダウンロード", expanded=True):
    results_table.render_intersection_table(query_result)

# --- 免責表示（design.md §9-4。文言の正文は仕様書§2-2、config.pyの1箇所のみ保持） --
st.markdown(disclaimer_inline_html(), unsafe_allow_html=True)  # §14 フォールバック
st.markdown(disclaimer_footer_html(), unsafe_allow_html=True)  # 固定フッター（対応環境）
