"""
BFF（Backend for Frontend）API サーバー（独立した Web Service）
React フロントエンドから呼び出されるエンドポイントを提供。
バックエンド（Laravel API）への接続は、Streamlit の既存 api_client.py を流用。
"""

import os
import sys
from pathlib import Path

# viewer モジュールをインポート可能にするため、親ディレクトリを sys.path に追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from viewer.api_client import (
    register_route,
    query_features,
    query_areas,
    get_connection_status,
)

app = FastAPI(title="Airspace Viewer BFF API")

# CORS 設定（React フロントエンドからのリクエストを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # PoC: すべてのオリジンを許可。本番ではホワイトリスト化
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRouteRequest(BaseModel):
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    altitude_m: float


class QueryFeaturesRequest(BaseModel):
    latitude: float
    longitude: float
    radius_degrees: float = 0.01


@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "ok"}


@app.post("/register_route")
async def register_route_endpoint(request: RegisterRouteRequest):
    """航路を登録する"""
    try:
        result = register_route(
            request.start_latitude,
            request.start_longitude,
            request.end_latitude,
            request.end_longitude,
            request.altitude_m,
        )
        if not result:
            raise HTTPException(status_code=500, detail="Failed to register route")
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query_features")
async def query_features_endpoint(request: QueryFeaturesRequest):
    """航路周辺の地物を取得する"""
    try:
        result = query_features(
            request.latitude, request.longitude, request.radius_degrees
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/connection_status")
async def connection_status_endpoint():
    """API 接続状態を確認"""
    try:
        status = get_connection_status()
        return {"status": "success", "connected": status}
    except Exception as e:
        return {"status": "error", "connected": False, "message": str(e)}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
