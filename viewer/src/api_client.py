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

from .altitude import extract_building_id, lookup_building_height
from .config import API_PREFIX, CREATED_BY, ENVIRONMENT, IS_POC, POC_PREFIX
from .spatial_id import DEFAULT_ZOOM_LEVEL, compute_real_spatial_id

# object_cdの割り当て（実コードに定義が無いため、Phase B投入時に本PoCで独自に定めた規約。
# airway-digitaltwin-db/drone-web/laravel/app/Console/Commands/ImportPlateauFeatures.php
# と一致させること）。
OBJECT_CD_LAYERS = {
    1: "building",
    2: "road",
    3: "landslide",
    4: "flood",
    5: "landuse",
}


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


def _center_spatial_id(bbox: tuple) -> str:
    min_lat, min_lon, max_lat, max_lon = bbox
    center_lat, center_lon = (min_lat + max_lat) / 2, (min_lon + max_lon) / 2
    return compute_real_spatial_id(lon=center_lon, lat=center_lat, zoom=DEFAULT_ZOOM_LEVEL)


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

        実コード確認済み（GroundFeatureVoxelController::get_ground_feature_voxel）:
        パラメータは bbox ではなく other.typeCd（数値の地物種別コード）・
        identification（空間ID）・timing（日時）。この関数は自前でtry/catchして
        いないため、必須パラメータが欠けると例外が非捕捉のまま500になる。
        またレスポンスは footprint（緯度経度ポリゴン）を含まず、ボクセルビット
        ファイルへの参照（spatialId／voxelBitFileName等）を返す。地図上への
        ポリゴン描画は未対応（Phase B完了後、ボクセル形式のデコードが別途必要）。
        """
        if self.mock:
            return self._mock_buildings(bbox)

        identification = _center_spatial_id(bbox)
        results = []
        for type_cd, layer_label in OBJECT_CD_LAYERS.items():
            params = {
                "other[typeCd]": type_cd,
                "identification": identification,
                "timing": _now_mysql_datetime(),
            }
            data = self._get("/ground_feature_voxel", params=params)
            objects = data.get("objects", []) if isinstance(data, dict) else []
            for obj in objects:
                voxel = {
                    "id": obj.get("spatialId"),
                    "layer": layer_label,
                    "source": "airspace-drone-web（ボクセル形式・地図描画未対応）",
                    "is_poc": False,
                    "raw": obj,
                }
                if layer_label == "building":
                    # 仕様書§5-3: 実APIレスポンスにmeasuredHeightは含まれないため、
                    # voxelBitFileName（plateau/{mesh}/{buildingId}.json）からbuildingIdを
                    # 逆引きし、Phase B投入時に保持したクライアント側の高さ表（altitude.py）
                    # と突き合わせる。
                    voxel_bit_file_path = (obj.get("other") or {}).get("voxelBitFileName")
                    building_id = extract_building_id(voxel_bit_file_path)
                    voxel["height_m"] = lookup_building_height(building_id)
                results.append(voxel)
        return results

    # --- エリア（注意区域）：POST /airDtw/api/area、GET汎用オブジェクト --
    def register_area(self, name: str, polygon: list[tuple], category: str = "caution") -> dict:
        """実コード確認済み（AreaObjectController::set_area_object_masters）。

        featuresはGeoJSON Feature配列。properties.areaは自由文字列（DBのarea_id列、
        主キーではない）。properties.timestamp・traffics[].currentTimeは
        'Y-m-d H:i:s'厳密一致（T区切りでも可、内部でformat_iso8601により変換される）。
        成功時のレスポンス本文は空で、DB上の主キー（area_object_id、自動採番）は
        APIから返ってこない。properties.areaに指定した値（=poc_name）を手掛かりに
        DB側で引く必要がある。
        """
        poc_name = f"{POC_PREFIX}{name}"
        if self.mock:
            record = {
                "name": poc_name,
                "polygon": [{"lat": p[0], "lon": p[1]} for p in polygon],
                "category": category,
                **poc_metadata(),
                "id": str(uuid.uuid4()),
            }
            self._store["areas"].append(record)
            return record

        now = _now_mysql_datetime()
        ring = [[p[1], p[0]] for p in polygon]
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        payload = {
            "features": [
                {
                    "geometry": {"type": "Polygon", "coordinates": [ring]},
                    "properties": {
                        "area": poc_name,
                        "timestamp": now,
                        "intrusionStatus": 0,
                        "traffics": [{"currentTime": now}],
                    },
                }
            ]
        }
        self._post("/area", payload)

        return {
            "id": poc_name,
            "name": poc_name,
            "polygon": [{"lat": p[0], "lon": p[1]} for p in polygon],
            "category": category,
            **poc_metadata(),
        }

    def list_areas(self, bbox: tuple | None = None) -> list[dict]:
        if self.mock:
            return list(self._store["areas"])

        # 実コード確認済み（GeneralPurposeController::get_general_purpose、
        # AreaObjectController::get_area）: identification（空間ID）・timing・
        # requestType=area に加え、other[timingTo]（検索対象期間の終端日時）が必須。
        # 抽出条件は from_datetime BETWEEN timing AND timingTo であり
        # （"timingの時点で有効か"ではない）、過去に登録した分も拾うため
        # timingには十分過去の固定値を使う。
        identification = _center_spatial_id(bbox) if bbox else None
        params = {
            "identification": identification,
            "timing": "2000-01-01 00:00:00",
            "requestType": "area",
            "other[timingTo]": "9999-12-31 23:59:59",
        }
        data = self._get("/general_purpose", params=params)
        objects = (data.get("result") or {}).get("objects", []) if isinstance(data, dict) else []
        results = []
        for obj in objects:
            name = (obj.get("other") or {}).get("area")
            results.append(
                {
                    "id": obj.get("spatialId"),
                    "name": name,
                    "source": "airspace-drone-web（ボクセル形式・地図描画未対応）",
                    # 実APIのレスポンスにis_poc等のメタデータは含まれないため、
                    # 唯一返ってくる識別子（area_id、properties.areaに設定した値）の
                    # 接頭辞で判定する（仕様書§6-1・受入基準§11-8対応）。
                    "is_poc": bool(name) and str(name).startswith(POC_PREFIX),
                    "raw": obj,
                }
            )
        return results

    # --- 飛行禁止区域：POST /airDtw/api/flight_prohibited_area --------
    def register_flight_prohibited_area(self, name: str, polygon: list[tuple]) -> dict:
        """実コード確認済み（FlightProhibitedAreaController::set_flight_prohibited_area）:
        本メソッドのpayloadは実際の必須形式（flightProhibitedAreaInfo配列、
        flightProhibitedAreaId／range／flightProhibitedAreaTypeId／startTime等）と
        まだ一致していない。register_areaと同様、UI未実装のため未検証のまま残す。
        """
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

    def list_flight_prohibited_areas(self, bbox: tuple | None = None) -> list[dict]:
        if self.mock:
            return list(self._store["prohibited_areas"])

        identification = _center_spatial_id(bbox) if bbox else None
        params = {
            "identification": identification,
            "timing": _now_mysql_datetime(),
            "requestType": "flightProhibitedArea",
        }
        data = self._get("/general_purpose", params=params)
        objects = (data.get("result") or {}).get("objects", []) if isinstance(data, dict) else []
        results = []
        for obj in objects:
            name = (obj.get("other") or {}).get("name")
            results.append(
                {
                    "id": obj.get("spatialId"),
                    "name": name,
                    "source": "airspace-drone-web（ボクセル形式・地図描画未対応）",
                    "is_poc": bool(name) and str(name).startswith(POC_PREFIX),
                    "raw": obj,
                }
            )
        return results

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
