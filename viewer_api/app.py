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


def _base_url() -> str:
    """render.yaml の fromService で注入される Private Service の host/port から
    Laravel のベースURLを組み立てる。無ければローカル開発向けにフォールバックする。"""
    host = os.environ.get("DIGITAL_TWIN_HOST")
    port = os.environ.get("DIGITAL_TWIN_PORT")
    if host and port:
        return f"http://{host}:{port}"
    return os.environ.get("DIGITAL_TWIN_BASE_URL", "http://localhost:8000")


def _client() -> DigitalTwinApiClient:
    """リクエストごとにクライアントを作る。DIGITAL_TWIN_HOST が無い環境
    （ローカルでの単体確認など）では mock で動かし、疎通経路の確認だけはできるようにする。

    state は渡さない ＝ インスタンスごとの一時辞書になる。BFF はステートレスで、
    Laravel が唯一の永続層という前提。
    """
    return DigitalTwinApiClient(
        base_url=_base_url(),
        mock=not bool(os.environ.get("DIGITAL_TWIN_HOST")),
        api_key=os.environ.get("DIGITAL_TWIN_API_KEY") or None,
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
    """Laravel API への到達可否。'connected' / 'disconnected' / 'error'。"""
    try:
        state = _client().check_connection()
    except Exception as exc:  # 設定不備などで生成自体に失敗した場合
        return {"status": "error", "connected": False, "state": "error", "message": str(exc)}
    return {"status": "success", "connected": state == "connected", "state": state}


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

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
