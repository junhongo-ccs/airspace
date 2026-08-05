"""空域デジタルツインAPI（仕様書§6）クライアント。

Phase A（`Drone-web`+MySQLのローカルDocker起動）が未実施のため、
既定は mock=True で動作する。st.session_state 上のインメモリストアに
登録・取得を再現し、実APIが立ち上がった時点で mock=False へ切り替えるだけで
同じ呼び出しコードが実APIへ向くようにしてある。

エンドポイント定義の根拠：仕様書§6、§14「実コード確認の根拠」。
PoC識別（POC-CHICHIBU-接頭辞、source/created_by/created_at/environment/is_poc）は
仕様書§6-1に対応する。
"""

from __future__ import annotations

import random
import time
import uuid
from datetime import datetime, timezone

import requests
import streamlit as st

from .config import API_PREFIX, CREATED_BY, ENVIRONMENT, IS_POC, POC_PREFIX


class ApiError(Exception):
    def __init__(self, message: str, status_code: int | None = None, endpoint: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.endpoint = endpoint


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _now_mysql_datetime() -> str:
    """実コード確認済み: ApiFunction::check_datetime は 'Y-m-d H:i:s' の厳密一致のみ許可する
    （airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/ApiFunction.php）。"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _generate_numeric_id() -> int:
    """DroneRouteController::drone_route は drone_route_id（数値、クライアント採番）を
    必須パラメータとして要求する。DBの主キーとして使われるため、衝突しにくい値にする。"""
    return int(time.time() * 1000) % 2_000_000_000 + random.randint(0, 999)


def _safe_json(resp: requests.Response):
    """実コード確認済み: drone_route の登録成功時など、本文が空のレスポンスがある
    （DroneRouteController::drone_route の成功パスはreturn文が無い）。
    空またはJSONとして解釈できない場合はエラーにせず空dictを返す。"""
    if not resp.content:
        return {}
    try:
        return resp.json()
    except ValueError:
        return {"raw": resp.text}


def poc_metadata() -> dict:
    """仕様書§6-1: すべてのPoCレコードに必須のメタデータ。"""
    return {
        "source": "viewer-poc",
        "created_by": CREATED_BY,
        "created_at": _now_iso(),
        "environment": ENVIRONMENT,
        "is_poc": IS_POC,
    }


class DigitalTwinApiClient:
    """api_key を指定すると、Drone-web側の簡易APIキー認証（junhongo-ccs/airway-digitaltwin-db
    の VerifyApiKey ミドルウェア）向けに X-API-Key ヘッダーを全リクエストへ付与する。"""

    def __init__(self, base_url: str, mock: bool = True, api_key: str | None = None, timeout: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.mock = mock
        self.api_key = api_key
        self.timeout = timeout
        if mock:
            self._store = st.session_state.setdefault(
                "_mock_digital_twin_store",
                {"routes": [], "areas": [], "prohibited_areas": [], "voxels": None},
            )
        else:
            # 実APIの GET /drone_route は drone_route_id 単体取得のみで一覧取得が無く、
            # POST /drone_route も成功時に本文を返さない（実コード確認済み）。
            # そのため「このセッションで登録したid」と「登録時に送った表示用の座標等」を
            # クライアント側で覚えておき、list_routes()ではidごとにGETして存在確認しつつ、
            # 表示にはこのキャッシュを使う。
            self._real_route_cache = st.session_state.setdefault("_real_digital_twin_route_cache", {})

    def _headers(self) -> dict:
        return {"X-API-Key": self.api_key} if self.api_key else {}

    # --- 接続状態（design.md §9-1） -----------------------------------
    def check_connection(self) -> str:
        """'connected' / 'disconnected' / 'error' のいずれかを返す。

        実コード確認済み: GET /drone_route は drone_route_id が無いと400、
        存在しないidでも400（"is not exist"）を返す。400は「サーバへは到達し
        認証も通ったが、該当データが無いだけ」なので接続確認としては成功扱いにする。
        401/403（認証失敗）と5xx（サーバ側エラー）だけを"error"とする。
        """
        if self.mock:
            return "connected"
        try:
            resp = requests.get(
                f"{self.base_url}{API_PREFIX}/drone_route",
                params={"drone_route_id": 0},
                headers=self._headers(),
                timeout=self.timeout,
            )
        except requests.exceptions.RequestException:
            return "disconnected"
        if resp.status_code in (401, 403) or resp.status_code >= 500:
            return "error"
        return "connected"

    # --- 航路：POST/GET /airDtw/api/drone_route -----------------------
    def register_route(self, name: str, start: tuple, end: tuple, agl_m: float, layers: list[str]) -> dict:
        poc_name = f"{POC_PREFIX}{name}"
        if self.mock:
            record = {
                "name": poc_name,
                "start": {"lat": start[0], "lon": start[1]},
                "end": {"lat": end[0], "lon": end[1]},
                "agl_m": agl_m,
                "layers": layers,
                **poc_metadata(),
                "id": str(uuid.uuid4()),
            }
            self._store["routes"].append(record)
            return record

        # 実コード確認済み（DroneRouteController::drone_route）:
        # drone_route_id（数値、クライアント採番）・drone_route_name・coordinates・
        # from_datetime が必須。成功時のレスポンス本文は空（_postがそれを許容する）。
        route_id = _generate_numeric_id()
        payload = {
            "drone_route_id": route_id,
            "drone_route_name": poc_name,
            "coordinates": {
                "type": "LineString",
                "coordinates": [[start[1], start[0]], [end[1], end[0]]],
            },
            "from_datetime": _now_mysql_datetime(),
        }
        self._post("/drone_route", payload)

        record = {
            "id": route_id,
            "name": poc_name,
            "start": {"lat": start[0], "lon": start[1]},
            "end": {"lat": end[0], "lon": end[1]},
            "agl_m": agl_m,
            "layers": layers,
            **poc_metadata(),
        }
        self._real_route_cache[route_id] = record
        return record

    def list_routes(self) -> list[dict]:
        if self.mock:
            return list(self._store["routes"])

        # 実APIには一覧取得が無い（GET /drone_route は drone_route_id 必須の単体取得）。
        # このセッションで登録したidをキャッシュから辿り、1件ずつGETしてDB上の存在を
        # 確認する。表示用の座標等はAPIが返さないため、登録時にキャッシュした値を使う。
        routes = []
        for route_id, cached in self._real_route_cache.items():
            confirmed = False
            try:
                self._get("/drone_route", params={"drone_route_id": route_id})
                confirmed = True
            except ApiError:
                confirmed = False
            routes.append({**cached, "server_confirmed": confirmed})
        return routes

    # --- 地物ボクセル：GET /airDtw/api/ground_feature_voxel -----------
    def get_ground_feature_voxel(self, bbox: tuple) -> list[dict]:
        """bbox = (min_lat, min_lon, max_lat, max_lon)

        Phase B（PLATEAU秩父市2025投入）が未実施のため、mockは
        「区分＝PoC」かつ出典に「mock」と明記したプレースホルダ建物を返す。
        実データ投入後は最初にこのメソッドの mock 分岐だけを外す。
        """
        if self.mock:
            return self._mock_buildings(bbox)
        return self._get("/ground_feature_voxel", params={"bbox": ",".join(map(str, bbox))})

    # --- エリア（注意区域）：POST /airDtw/api/area、GET汎用オブジェクト --
    def register_area(self, name: str, polygon: list[tuple], category: str = "caution") -> dict:
        payload = {
            "name": f"{POC_PREFIX}{name}",
            "polygon": [{"lat": p[0], "lon": p[1]} for p in polygon],
            "category": category,
            **poc_metadata(),
        }
        if self.mock:
            record = dict(payload, id=str(uuid.uuid4()))
            self._store["areas"].append(record)
            return record
        return self._post("/area", payload)

    def list_areas(self) -> list[dict]:
        if self.mock:
            return list(self._store["areas"])
        return self._get("/general_purpose", params={"type": "area"})

    # --- 飛行禁止区域：POST /airDtw/api/flight_prohibited_area --------
    def register_flight_prohibited_area(self, name: str, polygon: list[tuple]) -> dict:
        payload = {
            "name": f"{POC_PREFIX}{name}",
            "polygon": [{"lat": p[0], "lon": p[1]} for p in polygon],
            **poc_metadata(),
        }
        if self.mock:
            record = dict(payload, id=str(uuid.uuid4()))
            self._store["prohibited_areas"].append(record)
            return record
        return self._post("/flight_prohibited_area", payload)

    def list_flight_prohibited_areas(self) -> list[dict]:
        if self.mock:
            return list(self._store["prohibited_areas"])
        return self._get("/general_purpose", params={"type": "flight_prohibited_area"})

    # --- HTTPヘルパー（mock=False、実API疎通用） -----------------------
    def _get(self, path: str, params: dict | None = None):
        url = f"{self.base_url}{API_PREFIX}{path}"
        try:
            resp = requests.get(url, params=params, headers=self._headers(), timeout=self.timeout)
        except requests.exceptions.RequestException as exc:
            raise ApiError(str(exc), endpoint=url) from exc
        if resp.status_code >= 400:
            raise ApiError(
                f"HTTP {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code, endpoint=url
            )
        return _safe_json(resp)

    def _post(self, path: str, payload: dict):
        url = f"{self.base_url}{API_PREFIX}{path}"
        try:
            resp = requests.post(url, json=payload, headers=self._headers(), timeout=self.timeout)
        except requests.exceptions.RequestException as exc:
            raise ApiError(str(exc), endpoint=url) from exc
        if resp.status_code >= 400:
            raise ApiError(
                f"HTTP {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code, endpoint=url
            )
        return _safe_json(resp)

    # --- mockデータ -----------------------------------------------------
    def _mock_buildings(self, bbox: tuple) -> list[dict]:
        if self._store["voxels"] is None:
            min_lat, min_lon, max_lat, max_lon = bbox
            lat_c, lon_c = (min_lat + max_lat) / 2, (min_lon + max_lon) / 2
            d = 0.001
            self._store["voxels"] = [
                {
                    "id": f"mock-building-{i}",
                    "layer": "building",
                    "footprint": [
                        [lat_c + d * i, lon_c - d],
                        [lat_c + d * i, lon_c + d],
                        [lat_c + d * i + d * 0.6, lon_c + d],
                        [lat_c + d * i + d * 0.6, lon_c - d],
                    ],
                    "height_m": 10 + i * 3,
                    "source": "mock（Phase B未実施のプレースホルダ）",
                    "is_poc": True,
                }
                for i in range(3)
            ]
        return list(self._store["voxels"])
