"""design.md のカラートークン・タイポグラフィ・レイアウトをCSSとして注入する。

対応表：
- §5-1〜§5-4 カラートークン
- §6 タイポグラフィ
- §3 グリッドとスペーシング
- §4-2 推奨寸法（左パネル幅、フッター高）
- §14 Streamlit実装時の許容差（左パネル幅・入力欄高さ・固定フッターの代替）

ブランドカラーのHEXは design.md §5-1 の「暫定値」をそのまま転記している。
正式値が決まったら本ファイルの _BRAND_CSS_VARS だけを差し替えれば全体に反映される。
"""

import streamlit as st

from .config import DISCLAIMER_TEXT

# design.md §5-1（暫定値。§16 未決定事項：公式ブランドガイドラインの値へ差し替えること）
_BRAND_CSS_VARS = """
    --brand-future-blue: #0F6FC6;
    --brand-navy: #0B1E2D;
    --brand-black: #000000;
    --brand-white: #FFFFFF;
    --brand-blue-light: #3E9BE0;
    --brand-blue-mid: #0F6FC6;
    --brand-blue-dark: #0B3D75;
    --brand-cyan: #00D2E6;
    --brand-green: #3FD35F;
    --brand-yellow: #FFD400;
    --brand-orange: #FF8A00;
    --brand-red: #E8380D;
"""

# design.md §5-2, §5-3, §5-4
_SEMANTIC_CSS_VARS = """
    --bg-app: #F4F6F8;
    --bg-panel: var(--brand-white);
    --bg-table-head: #EAEEF2;
    --border: #D0D7DE;
    --text-primary: var(--brand-navy);
    --text-secondary: #5A6B78;
    --action-primary: var(--brand-future-blue);
    --action-primary-text: var(--brand-white);
    --focus-ring: var(--brand-future-blue);

    --map-route: var(--brand-blue-dark);
    --map-route-draft: var(--brand-blue-light);
    --map-caution: var(--brand-orange);
    --map-prohibited: var(--brand-red);
    --map-building: #8A96A0;
    --map-terrain-low: var(--brand-green);
    --map-terrain-high: #8C6239;
    --map-unknown: var(--brand-yellow);

    --status-ok: var(--brand-green);
    --status-warn: var(--brand-orange);
    --status-error: var(--brand-red);
    --status-idle: #8A96A0;
"""

# design.md §6-1
_FONT_CSS_VARS = """
    --font-jp: "Yu Gothic UI", "Meiryo UI", sans-serif;
    --font-latin: "Segoe UI", Arial, sans-serif;
    --font-mono: "Cascadia Mono", Consolas, monospace;
"""

_CSS = f"""
<style>
:root {{
{_BRAND_CSS_VARS}
{_SEMANTIC_CSS_VARS}
{_FONT_CSS_VARS}
    --footer-height: 40px;   /* design.md §4-2 */
    --panel-width: 320px;    /* design.md §4-2 */
}}

html, body, [class*="css"] {{
    font-family: var(--font-jp);
    color: var(--text-primary);
}}

.stApp {{
    background-color: var(--bg-app);
}}

/* design.md §4-2 左設定パネル幅。
   §14: st.sidebarは幅を直接指定できないため、CSS上書きで対応する（許容差300〜340px）。*/
[data-testid="stSidebar"] {{
    min-width: var(--panel-width) !important;
    max-width: 340px !important;
    background-color: var(--bg-panel);
    border-right: 1px solid var(--border);
}}

/* design.md §10 入力欄高さ32px（許容差：§14により40pxまで許容） */
[data-testid="stSidebar"] input, [data-testid="stSidebar"] select {{
    font-size: 13px;
}}

/* design.md §6-2 サイズ階層 */
h1 {{ font-size: 16px !important; font-weight: 600 !important; line-height: 24px !important; }}
h2, h3 {{ font-size: 13px !important; font-weight: 600 !important; line-height: 20px !important; }}
p, label, .stMarkdown {{ font-size: 13px; line-height: 20px; }}

/* design.md §6-1: 座標・空間ID・ボクセルID・API応答・JSON は等幅必須 */
.mono, code, pre {{
    font-family: var(--font-mono) !important;
}}

/* design.md §6-2: 補足・出典・注釈（最小11px、§6-2） */
.caption-text {{
    font-size: 11px;
    line-height: 16px;
    color: var(--text-secondary);
}}

/* design.md §9-1〜§9-3: 状態バッジ共通スタイル。色だけに依存せず文字列を併記する（§5-6） */
.status-badge {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--bg-app);
    border: 1px solid var(--border);
}}
.status-dot {{
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}}
.status-ok .status-dot {{ background: var(--status-ok); }}
.status-warn .status-dot {{ background: var(--status-warn); }}
.status-error .status-dot {{ background: var(--status-error); }}
.status-idle .status-dot {{ background: var(--status-idle); }}

/* design.md §9-3: PoC識別バッジ（画面右上） */
.poc-badge {{
    display: inline-block;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 4px;
    background: var(--brand-navy);
    color: var(--brand-white);
    letter-spacing: 0.02em;
}}

/* design.md §10-1: 要確認バッジ */
.attention-badge {{
    display: inline-block;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--status-warn);
    color: var(--brand-navy);
    font-weight: 600;
}}

/* design.md §9-4, §4-2: 免責表示の固定フッター（高さ40px）。
   §14: Streamlit標準機能に無いためCSS注入で対応。位置固定が効かない環境では
   本文の直前にも同一要素が複製される（フォールバック）。*/
.disclaimer-footer {{
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--footer-height);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    background: var(--brand-navy);
    color: var(--brand-white);
    font-size: 11px;
    line-height: 16px;
    text-align: center;
    z-index: 9999;
    border-top: 2px solid var(--status-warn);
}}
.disclaimer-footer-inline {{
    background: var(--brand-navy);
    color: var(--brand-white);
    font-size: 11px;
    line-height: 16px;
    text-align: center;
    padding: 8px 16px;
    border-radius: 4px;
    margin-top: 8px;
}}

/* フッターの下に隠れないよう本文末尾に余白を確保 */
.block-container {{
    padding-bottom: calc(var(--footer-height) + 24px);
}}

/* design.md §12: フォーカスリング（内側1px白＋外側2px --focus-ring） */
*:focus-visible {{
    outline: 2px solid var(--focus-ring) !important;
    outline-offset: 1px;
    box-shadow: 0 0 0 1px var(--brand-white) inset;
}}

/* design.md §7: テーブル本文12px、行高32px（許容差：§14により40pxまで許容） */
[data-testid="stDataFrame"] {{
    font-size: 12px;
}}
</style>
"""


def inject_theme() -> None:
    st.markdown(_CSS, unsafe_allow_html=True)


def status_badge_html(label: str, state: str) -> str:
    """state: ok / warn / error / idle"""
    return (
        f'<span class="status-badge status-{state}">'
        f'<span class="status-dot"></span>{label}</span>'
    )


def poc_badge_html(environment: str) -> str:
    return f'<span class="poc-badge">PoC / {environment}</span>'


def disclaimer_footer_html() -> str:
    """design.md §9-4: 仕様書§2-2の文言をそのまま表示する。文言の保持は config.py の1箇所のみ。"""
    return f'<div class="disclaimer-footer">{DISCLAIMER_TEXT}</div>'


def disclaimer_inline_html() -> str:
    """固定フッターが効かない実行環境向けのフォールバック（design.md §14）。"""
    return f'<div class="disclaimer-footer-inline">{DISCLAIMER_TEXT}</div>'
