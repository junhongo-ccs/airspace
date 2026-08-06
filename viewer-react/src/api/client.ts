// BFF（Streamlit + FastAPI）経由で Laravel API にアクセス
// 設計: React → Streamlit BFF (/api) → Laravel API (/airDtw/api)
// 参照: 仕様書§5-5、実装タスク 3-2-2・3-2-3

// 既定はローカルの BFF。8000 は Laravel が使うため BFF は 8001。
const BFF_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

// BFF が返す航路レコード（viewer/src/api_client.py の register_route の戻り値）。
// 識別子は id に統一する（実APIでは数値、モックではUUIDだがBFFで文字列へ揃えている）。
export interface DroneRoute {
  id: string;
  name: string;
  start: { lat: number; lon: number };
  end: { lat: number; lon: number };
  agl_m: number;
  created_at: string;
}

// BFF が返す地物ボクセル。実APIはボクセル参照を返すため footprint は含まれない。
export interface GroundFeature {
  id: string;
  layer: string; // building / road / landslide / flood / landuse
  source: string;
  is_poc: boolean;
  height_m?: number | null;
  raw?: unknown;
}

export interface ApiResponse<T> {
  data?: T[];
  message?: string;
  status: number;
  timestamp: string;
}

// FastAPI は失敗時に {"detail": "..."} を返す。表示用の文字列へ整形する。
async function describeError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body?.detail) return `HTTP ${response.status}: ${body.detail}`;
  } catch {
    // JSON でない場合は下のフォールバックへ
  }
  return `HTTP ${response.status} from BFF`;
}

// 航路を登録（BFF 経由）
export async function registerRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  altitudeM: number
): Promise<DroneRoute | null> {
  try {
    const response = await fetch(`${BFF_BASE}/register_route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_latitude: startLat,
        start_longitude: startLon,
        end_latitude: endLat,
        end_longitude: endLon,
        altitude_m: altitudeM,
      }),
    });

    if (!response.ok) {
      // BFF は失敗理由を detail に入れて返す。握りつぶすと画面上は
      // 「Failed to register route」としか出ず原因が追えないため、そのまま投げる。
      throw new Error(await describeError(response));
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Failed to register route:', error);
    throw error;
  }
}

// 航路周辺の地物ボクセルを取得（BFF 経由）
export async function getGroundFeatures(
  latitude: number,
  longitude: number,
  radiusDegrees: number = 0.01
): Promise<GroundFeature[]> {
  try {
    const response = await fetch(`${BFF_BASE}/query_features`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        radius_degrees: radiusDegrees,
      }),
    });

    if (!response.ok) {
      // 空配列を返すと「照会成功・0件」と区別が付かず、Laravel照会の失敗が
      // 正常な結果として画面に出てしまう。登録と同様に失敗として扱う。
      throw new Error(await describeError(response));
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch ground features:', error);
    throw error;
  }
}

// 飛行禁止区域を取得（現在未使用、将来の機能拡張用）
export async function getFlightProhibitedAreas(
  latitude: number,
  longitude: number,
  radiusDegrees: number = 0.01
) {
  try {
    // BFF でこのエンドポイントが実装されたら使用
    const response = await fetch(`${BFF_BASE}/query_prohibited_areas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        radius_degrees: radiusDegrees,
      }),
    });

    if (!response.ok) {
      console.error(`BFF error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch prohibited areas:', error);
    return [];
  }
}

export interface ConnectionStatus {
  connected: boolean;
  state: 'connected' | 'disconnected' | 'error' | 'unknown';
  // BFF がモックで動いている場合 connected=true でも Laravel には届いていない。
  // 画面上でも区別できるようにこのフラグを持つ。
  mock: boolean;
  baseUrl?: string;
  message?: string;
}

// Laravel API への到達可否を確認（BFF 経由）。
// 状態を知るための関数なので、失敗時も throw せず状態として返す。
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  try {
    const response = await fetch(`${BFF_BASE}/connection_status`);
    if (!response.ok) {
      return {
        connected: false,
        state: 'error',
        mock: false,
        message: await describeError(response),
      };
    }
    const data = await response.json();
    return {
      connected: data.connected === true,
      state: data.state ?? 'unknown',
      mock: data.mock === true,
      baseUrl: data.base_url,
      message: data.message,
    };
  } catch (error) {
    // BFF 自体に届いていない（URL 誤り・CORS・サービス停止など）
    return {
      connected: false,
      state: 'disconnected',
      mock: false,
      message: error instanceof Error ? error.message : 'BFF unreachable',
    };
  }
}
