"""BFF（Backend for Frontend）API サーバー。

React フロントエンド（viewer-react）からの唯一の接続先。Laravel API
（airspace-drone-web、Private Service）はここからのみ呼ばれ、外部には公開しない。

    React → FastAPI BFF（この層）→ DigitalTwinApiClient → Laravel API

Laravel との通信は Streamlit Viewer と同じ viewer/src/api_client.py の
DigitalTwinApiClient を使う。同クラスは Streamlit 非依存（状態辞書は注入式）なので、
Streamlit が存在しないこのプロセスでもそのまま動く。

レスポンス契約: 航路の識別子は `id` に統一する（Streamlit 側の戻り値と同じ）。
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Render では repo ルートが /opt/render/project/src。viewer パッケージを解決できるよう、
# PYTHONPATH に依存せずここでも repo ルートを sys.path に入れておく。
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from viewer.src.api_client import ApiError, DigitalTwinApiClient  # noqa: E402

app = FastAPI(title="Airspace Viewer BFF API")

# CORS: React（airspace-viewer-react）からのブラウザ直叩きを許可する。
# PoC のため全オリジン許可。公開範囲を絞る段階でホワイトリスト化する（仕様書§9）。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# mock=True のときの登録結果を保持するプロセス内ストア。
# クライアントはリクエストごとに作り直すため、ここを渡さないと「登録した航路を
# 次のリクエストで読めない」挙動になる。あくまでローカル確認用で、
# ワーカー間では共有されない（Render は WEB_CONCURRENCY=1）。
_MOCK_STORE: dict = {}


def _base_url() -> str:
    """Laravel のベースURL。

    優先順位:
      1. DIGITAL_TWIN_BASE_URL（ローカルで実Laravelへ向ける場合に使う）
      2. render.yaml の fromService で注入される DIGITAL_TWIN_HOST/PORT
      3. ローカル開発の既定値
    """
    explicit = os.environ.get("DIGITAL_TWIN_BASE_URL")
    if explicit:
        return explicit
    host = os.environ.get("DIGITAL_TWIN_HOST")
    port = os.environ.get("DIGITAL_TWIN_PORT")
    if host and port:
        return f"http://{host}:{port}"
    return "http://localhost:8000"


def _truthy(raw: str) -> bool:
    return raw.strip().lower() in ("1", "true", "yes", "on")


def mock_mode() -> bool:
    """モックで動かすかどうか。

    MOCK_MODE を明示指定した場合は必ずそれに従う。ローカルで
    DIGITAL_TWIN_BASE_URL=http://localhost:8000 を指定したのに黙ってモックへ
    落ちる、という状況を作らないため、接続先の設定有無から推測するのは
    MOCK_MODE が未設定のときだけにする。
    """
    raw = os.environ.get("MOCK_MODE")
    if raw is not None and raw != "":
        return _truthy(raw)
    return not (os.environ.get("DIGITAL_TWIN_HOST") or os.environ.get("DIGITAL_TWIN_BASE_URL"))


def _client() -> DigitalTwinApiClient:
    """リクエストごとにクライアントを作る。BFF 自体は永続層を持たず、
    Laravel が唯一の真実（mock 時のみ _MOCK_STORE がその代役）。"""
    return DigitalTwinApiClient(
        base_url=_base_url(),
        mock=mock_mode(),
        api_key=os.environ.get("DIGITAL_TWIN_API_KEY") or None,
        state=_MOCK_STORE,
    )


class RegisterRouteRequest(BaseModel):
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    altitude_m: float
    name: str = "react-route"


class QueryFeaturesRequest(BaseModel):
    latitude: float
    longitude: float
    radius_degrees: float = 0.01


@app.get("/health")
async def health_check():
    """Render のヘルスチェック用。Laravel には触らない。"""
    return {"status": "ok"}


@app.get("/connection_status")
async def connection_status_endpoint():
    """Laravel API への到達可否。'connected' / 'disconnected' / 'error'。

    mock と base_url も返す。mock=True の "connected" は Laravel に届いたことを
    意味しないため、切り分け時にどちらを見ているのか判別できるようにする。
    """
    mock = mock_mode()
    base = _base_url()
    try:
        state, detail = _client().check_connection_detail()
    except Exception as exc:  # 設定不備などで生成自体に失敗した場合
        return {
            "status": "error",
            "connected": False,
            "state": "error",
            "mock": mock,
            "base_url": base,
            "message": str(exc),
        }
    # message は失敗理由（例: HTTP 401 Unauthorized）。到達性とAPIキーの
    # 切り分けをこのエンドポイントだけで完結させるために返す。
    return {
        "status": "success",
        "connected": state == "connected",
        "state": state,
        "mock": mock,
        "base_url": base,
        "message": detail,
    }


@app.post("/register_route")
async def register_route_endpoint(request: RegisterRouteRequest):
    """航路を登録する。戻り値の data.id が航路の識別子。"""
    try:
        record = _client().register_route(
            name=request.name,
            start=(request.start_latitude, request.start_longitude),
            end=(request.end_latitude, request.end_longitude),
            agl_m=request.altitude_m,
            layers=[],
        )
    except ApiError as exc:
        raise HTTPException(status_code=502, detail=f"Laravel API error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # id は数値（実API）または UUID 文字列（mock）。React 側では文字列として扱うため揃える。
    return {"status": "success", "data": {**record, "id": str(record.get("id"))}}


@app.post("/query_features")
async def query_features_endpoint(request: QueryFeaturesRequest):
    """指定座標周辺の地物ボクセルを取得する。"""
    r = request.radius_degrees
    bbox = (
        request.latitude - r,
        request.longitude - r,
        request.latitude + r,
        request.longitude + r,
    )
    try:
        features = _client().get_ground_feature_voxel(bbox)
    except ApiError as exc:
        raise HTTPException(status_code=502, detail=f"Laravel API error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"status": "success", "data": features}


if __name__ == "__main__":
    import uvicorn

    # ローカル既定は 8001。8000 は Laravel（DIGITAL_TWIN_BASE_URL の既定）が使うため
    # 衝突させない。Render では startCommand が --port $PORT を渡すのでここは通らない。
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8001)))
