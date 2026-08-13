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

from viewer.src.altitude import (  # noqa: E402
    evaluate_agl_legal_limit,
    evaluate_building_vertical,
    list_known_buildings,
    list_known_prohibited_areas,
)
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
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    margin_degrees: float = 0.01
    # 判定詳細（AGL 150m判定・建物垂直判定）に使う。省略時は判定を行わない。
    altitude_m: float | None = None


class QueryProhibitedAreasRequest(BaseModel):
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    margin_degrees: float = 0.01


# 実APIのDID地区（人口集中地区）・飛行禁止区域はポリゴン座標を返さない
# （list_flight_prohibited_areas参照）。建物のようにCityGMLから再抽出して
# 描画する手も無いため、この文言で「地図描画は未対応」と明示する。
NO_GEOMETRY_MESSAGE = "要確認（ジオメトリ未提供・ボクセル形式）"


def _bbox(coords: list[tuple]) -> tuple:
    lats = [c[0] for c in coords]
    lons = [c[1] for c in coords]
    return min(lats), min(lons), max(lats), max(lons)


def _bbox_overlap(a: tuple, b: tuple) -> bool:
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


def _route_bbox(start_lat, start_lon, end_lat, end_lon, margin: float) -> tuple:
    """始点・終点の両方からbboxを作る（`_bbox_from_route`、route_form.py相当）。

    始点のみで作ると、Streamlit版（航路全体の中点基準）と空間IDが1タイルずれて
    0件になることがあった（query_featuresで実際に踏んだ不具合）。
    """
    lats = [start_lat, end_lat]
    lons = [start_lon, end_lon]
    return (min(lats) - margin, min(lons) - margin, max(lats) + margin, max(lons) + margin)


def _judge_feature(feature: dict, route_bbox: tuple, altitude_m: float | None) -> str:
    """viewer/src/components/results_table.py の build_result_rows と同じ判定ロジック。

    Streamlit版と実装を共有するため、垂直判定（altitude.py）はそのままimportして使う。
    水平方向のbbox重なり判定はresults_table.pyがstreamlit/pandasに依存するため、
    ここでは同等の2関数だけを複製している（streamlit非依存を保つBFFの方針に合わせる）。
    """
    is_placeholder = "mock" in str(feature.get("source", ""))
    if feature.get("layer") == "building":
        height_m = feature.get("height_m")
        vertical = evaluate_building_vertical(height_m, altitude_m)
        footprint = feature.get("footprint")
        horizontally_clear = footprint is not None and not _bbox_overlap(
            _bbox(footprint), route_bbox
        )
        return "交差なし（水平方向に重なりなし）" if horizontally_clear else vertical
    if is_placeholder:
        return "要確認（属性不足・プレースホルダ）"
    if feature.get("footprint"):
        overlap = _bbox_overlap(_bbox(feature["footprint"]), route_bbox)
        return "要確認（水平方向・簡易判定）" if overlap else "交差なし（水平方向・簡易判定）"
    return NO_GEOMETRY_MESSAGE


@app.get("/health")
async def health_check():
    """Render のヘルスチェック用。Laravel には触らない。"""
    return {"status": "ok"}


@app.get("/known_prohibited_areas")
async def known_prohibited_areas_endpoint():
    """ジオメトリを再取得済みの飛行禁止区域を、Laravelへの照会なしで返す。

    航路を登録・照会する前から地図に危険区域を表示できるようにするための
    参照レイヤ用エンドポイント（座標入力に依存しない静的な参照データ）。
    「実際にLaravelへ登録されているか」の確認は/query_prohibited_areasが担う。
    """
    return {"status": "success", "data": list_known_prohibited_areas()}


@app.get("/known_buildings")
async def known_buildings_endpoint():
    """地図描画可能な建物を、Laravelへの照会なしで返す。

    現状はPLATEAU秩父市2025から抽出したPhase B投入分29件。航路登録前から
    建物レイヤーを表示・非表示できるようにするための参照レイヤ用エンドポイント。
    """
    return {"status": "success", "data": list_known_buildings()}


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
    """航路（始点・終点）周辺の地物ボクセルを取得する。

    始点のみでbboxを作ると、Streamlit版（航路全体の中点基準）と空間IDが
    1タイルずれて0件になることがあった。始点・終点の両方から作る。
    """
    bbox = _route_bbox(
        request.start_latitude, request.start_longitude,
        request.end_latitude, request.end_longitude, request.margin_degrees,
    )
    try:
        features = _client().get_ground_feature_voxel(bbox)
    except ApiError as exc:
        raise HTTPException(status_code=502, detail=f"Laravel API error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    route_bbox = _route_bbox(
        request.start_latitude, request.start_longitude,
        request.end_latitude, request.end_longitude, margin=0,
    )
    for feature in features:
        feature["intersect"] = _judge_feature(feature, route_bbox, request.altitude_m)

    return {
        "status": "success",
        "data": features,
        "route_judgment": evaluate_agl_legal_limit(request.altitude_m),
    }


@app.post("/query_prohibited_areas")
async def query_prohibited_areas_endpoint(request: QueryProhibitedAreasRequest):
    """DID地区（人口集中地区）等の飛行禁止区域を取得する。

    実APIレスポンス自体にはポリゴン座標が含まれないが、DID地区は
    digitaltwin:import-flight-prohibited-areaが安定したflightProhibitedAreaId
    （例: DID-11207-CHICHIBU）をvoxelBitFileNameに埋め込んでいるため、
    国土数値情報A16-2020から再取得したジオメトリをクライアント側で突き合わせて
    いる（DigitalTwinApiClient.list_flight_prohibited_areas参照。道路・土砂災害等
    ランダムUUID採番のレイヤは同じ手が使えないため引き続きジオメトリ無し）。
    既定の航路座標とDID地区は約3km離れているため、既定のままでは0件が正しい
    結果になる（仕様書§7-2-補参照）。
    """
    bbox = _route_bbox(
        request.start_latitude, request.start_longitude,
        request.end_latitude, request.end_longitude, request.margin_degrees,
    )
    try:
        areas = _client().list_flight_prohibited_areas(bbox)
    except ApiError as exc:
        raise HTTPException(status_code=502, detail=f"Laravel API error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    route_bbox = _route_bbox(
        request.start_latitude, request.start_longitude,
        request.end_latitude, request.end_longitude, margin=0,
    )
    for area in areas:
        rings = area.pop("polygon_rings", None)
        if rings:
            area["rings"] = rings
            all_points = [pt for ring in rings for pt in ring]
            overlap = _bbox_overlap(_bbox(all_points), route_bbox)
            area["intersect"] = "要確認（水平方向・簡易判定）" if overlap else "交差なし（水平方向・簡易判定）"
        else:
            area["intersect"] = NO_GEOMETRY_MESSAGE

    return {"status": "success", "data": areas}


if __name__ == "__main__":
    import uvicorn

    # ローカル既定は 8001。8000 は Laravel（DIGITAL_TWIN_BASE_URL の既定）が使うため
    # 衝突させない。Render では startCommand が --port $PORT を渡すのでここは通らない。
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8001)))
