"""簡易アクセスゲート。

仕様書§9「公開範囲：初期はアクセス制限を掛けた検証環境とする」に対応する。
Renderの無料〜Starterプランには標準のIPアローリスト機能が無いため、暫定的に
共有の合言葉（環境変数 `APP_ACCESS_CODE`）によるゲートで代替する。

ローカル開発時のように `APP_ACCESS_CODE` が未設定の場合はゲートをスキップする
（開発体験を損なわないため）。本番公開時は必ずRenderの環境変数として設定すること。

これはAPI認証やネットワーク制限の代替ではない。仕様書§9-1「外部公開前にAPI認証・
ネットワーク制限を追加する」は別途対応が必要。
"""

import os

import streamlit as st

from .config import APP_TITLE


def require_access_code() -> bool:
    access_code = os.environ.get("APP_ACCESS_CODE")
    if not access_code:
        return True
    if st.session_state.get("_access_granted"):
        return True

    st.markdown(f"# {APP_TITLE}")
    st.warning(
        "本ツールは公開GISデータを用いた検証用PoC環境です（仕様書§9）。"
        "アクセスコードを知っている関係者のみ利用できます。"
    )
    entered = st.text_input("アクセスコード", type="password", key="_access_code_input")
    if st.button("入室"):
        if entered == access_code:
            st.session_state["_access_granted"] = True
            st.rerun()
        else:
            st.error("アクセスコードが違います。")
    return False
