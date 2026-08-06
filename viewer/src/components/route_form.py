"""design.md §4-1・§10: 左設定パネル（API状態・評価状態・航路設定・レイヤ選択・登録・照会）。"""

import os
import time
from datetime import datetime, timezone

import streamlit as st

from ..api_client import ApiError, DigitalTwinApiClient
from . import status_panel

# 仕様書§5-1: 秩父市PLATEAU 2025整備範囲内の仮想1〜3km航路（デモ用の初期値）。
# Phase Bで実際に投入した建物データ（3次メッシュ53397062、29件）の中心付近を通るよう、
# bboxの中心が空間ID 17/0/116156/51483（建物データの空間ID）に一致するよう選定している。
DEFAULT_START = (35.9683357, 139.0313939)
DEFAULT_END = (35.9699357, 139.0333939)
# design.md §8-1 初期表示レイヤ
DEFAULT_LAYERS = ["地理院地図", "航路", "建物", "注意区域"]


def _bbox_from_route(start: tuple, end: tuple, margin: float = 0.01) -> tuple:
    lats = [start[0], end[0]]
    lons = [start[1], end[1]]
    return (min(lats) - margin, min(lons) - margin, max(lats) + margin, max(lons) + margin)


def _default_base_url() -> str:
    """RenderのairspaceviewerがPrivate Service airspace-drone-webと同居する場合、
    render.yamlのfromServiceで注入されるDIGITAL_TWIN_HOST/PORTから接続先を組み立てる。
    無ければローカル開発向けの既定値にフォールバックする。"""
    host = os.environ.get("DIGITAL_TWIN_HOST")
    port = os.environ.get("DIGITAL_TWIN_PORT")
    if host and port:
        return f"http://{host}:{port}"
    return "http://localhost:8000"


def render_settings_panel() -> dict:
    with st.sidebar:
        st.markdown("## API状態・評価状態")

        base_url = st.text_input(
            "API接続先",
            value=st.session_state.get("api_base_url", _default_base_url()),
            key="api_base_url",
            help="Drone-web（Laravel）のベースURL。APIプレフィックスは /airDtw/api（仕様書§6）。",
        )
        api_key = st.text_input(
            "APIキー（X-API-Key）",
            value=st.session_state.get("digital_twin_api_key", os.environ.get("DIGITAL_TWIN_API_KEY", "")),
            key="digital_twin_api_key",
            type="password",
            help="Drone-webの簡易APIキー認証（VerifyApiKeyミドルウェア）に対応するキー。"
            "モックAPI使用時は不要。",
        )
        mock_mode = st.toggle(
            "モックAPIを使用する",
            value=st.session_state.get("mock_mode", not bool(os.environ.get("DIGITAL_TWIN_HOST"))),
            key="mock_mode",
            help="実際のDrone-webが接続先に用意できていない場合はON。"
            "OFFにすると API接続先へ実際に接続を試みる。",
        )

        client = DigitalTwinApiClient(base_url, mock=mock_mode, api_key=api_key or None)
        connection_state = client.check_connection()
        status_panel.render_connection_status(connection_state, mock_mode)

        st.markdown("---")
        st.markdown("### 航路設定")
        col1, col2 = st.columns(2)
        with col1:
            start_lat = st.number_input("始点 緯度", value=DEFAULT_START[0], format="%.6f", key="start_lat")
            start_lon = st.number_input("始点 経度", value=DEFAULT_START[1], format="%.6f", key="start_lon")
        with col2:
            end_lat = st.number_input("終点 緯度", value=DEFAULT_END[0], format="%.6f", key="end_lat")
            end_lon = st.number_input("終点 経度", value=DEFAULT_END[1], format="%.6f", key="end_lon")

        agl_m = st.number_input("AGL（地上高、m）", min_value=0.0, value=100.0, step=10.0, key="agl_m")

        space_id, resolution_m = status_panel.render_space_id((start_lat, start_lon), agl_m)

        st.markdown("### レイヤ選択")
        layers = [layer for layer in DEFAULT_LAYERS if st.checkbox(layer, value=True, key=f"layer_{layer}")]

        st.markdown("### 評価状態")
        status_panel.render_altitude_verification_status()

        st.markdown("---")
        st.markdown("### 登録・照会")

        try:
            current_route_count = len(client.list_routes())
        except ApiError:
            current_route_count = None

        count_label = "取得できません" if current_route_count is None else f"{current_route_count}件"
        st.caption(f"登録済み航路数（実行前）: {count_label} ／ 対象レイヤ: {', '.join(layers) or 'なし'}")

        register_clicked = st.button("航路を登録", type="primary", use_container_width=True)
        query_clicked = st.button("周辺データを照会", type="primary", use_container_width=True)

        st.caption("以下はPhase A（仕様書§10-3）の受入基準確認用。design.mdの正式なUI要素ではない。")
        area_register_clicked = st.button("テスト用の注意区域を登録（Phase A確認用）", use_container_width=True)

    ctx = {
        "client": client,
        "connection_state": connection_state,
        "mock_mode": mock_mode,
        "start": (start_lat, start_lon),
        "end": (end_lat, end_lon),
        "agl_m": agl_m,
        "layers": layers,
        "space_id": space_id,
        "resolution_m": resolution_m,
    }

    if register_clicked:
        _handle_register(client, ctx)
    if query_clicked:
        _handle_query(client, ctx)
    if area_register_clicked:
        _handle_register_area(client, ctx)

    return ctx


def _handle_register(client: DigitalTwinApiClient, ctx: dict) -> None:
    """design.md §10: 実行前の件数・対象レイヤはサイドバーのcaptionで既に明示済み。
    ここでは実行後の結果件数とAPI応答時刻を記録する。"""
    try:
        before_count = len(client.list_routes())
    except ApiError:
        before_count = None
    try:
        with st.spinner("登録中..."):
            record = client.register_route(
                name=f"route-{int(time.time())}",
                start=ctx["start"],
                end=ctx["end"],
                agl_m=ctx["agl_m"],
                layers=ctx["layers"],
            )
        after_count = len(client.list_routes())
        st.session_state["last_register_result"] = {
            "ok": True,
            "record": record,
            "before_count": before_count,
            "after_count": after_count,
            "responded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    except ApiError as exc:
        st.session_state["last_register_result"] = {
            "ok": False,
            "error": str(exc),
            "status_code": exc.status_code,
            "endpoint": exc.endpoint,
        }


def _handle_query(client: DigitalTwinApiClient, ctx: dict) -> None:
    """4つの取得元（航路・地物ボクセル・注意区域・禁止区域）はそれぞれ独立したAPI
    呼び出しであり、1つが失敗しても他の成功結果まで捨てないよう個別にcatchする。"""
    bbox = _bbox_from_route(ctx["start"], ctx["end"])
    errors: dict = {}

    def _safe(label: str, fn):
        try:
            return fn()
        except ApiError as exc:
            errors[label] = {"error": str(exc), "status_code": exc.status_code, "endpoint": exc.endpoint}
            return []

    with st.spinner("照会中..."):
        routes = _safe("routes", client.list_routes)
        voxels = _safe("voxels", lambda: client.get_ground_feature_voxel(bbox))
        areas = _safe("areas", lambda: client.list_areas(bbox))
        prohibited = _safe("prohibited", lambda: client.list_flight_prohibited_areas(bbox))

    st.session_state["last_query_result"] = {
        "ok": True,
        "routes": routes,
        "voxels": voxels,
        "areas": areas,
        "prohibited": prohibited,
        "bbox": bbox,
        "agl_m": ctx["agl_m"],
        "errors": errors,
        "responded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def _handle_register_area(client: DigitalTwinApiClient, ctx: dict) -> None:
    """Phase A受入基準（仕様書§10-3、§11-3）「サンプルの注意区域を登録し、APIから
    照会できることを確認する」の検証用。design.mdに規定された正式なUI要素ではない。

    航路のbboxを単純な矩形ポリゴンとして注意区域登録に使う（座標選択UIは未実装）。
    """
    bbox = _bbox_from_route(ctx["start"], ctx["end"], margin=0.002)
    min_lat, min_lon, max_lat, max_lon = bbox
    polygon = [(min_lat, min_lon), (min_lat, max_lon), (max_lat, max_lon), (max_lat, min_lon)]
    try:
        with st.spinner("注意区域を登録中..."):
            record = client.register_area(name=f"caution-{int(time.time())}", polygon=polygon)
        st.success(f"注意区域を登録しました（area_id: {record['id']}）。「周辺データを照会」で取得を確認してください。")
    except ApiError as exc:
        st.error(f"注意区域の登録に失敗しました（エンドポイント: {exc.endpoint}、HTTPステータス: {exc.status_code}、詳細: {exc}）")
