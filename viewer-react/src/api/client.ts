// BFF（Streamlit + FastAPI）経由で Laravel API にアクセス
// 設計: React → Streamlit BFF (/api) → Laravel API (/airDtw/api)
// 参照: 仕様書§5-5、実装タスク 3-2-2・3-2-3

const BFF_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export interface DroneRoute {
  drone_route_id: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  altitude_m: number;
  created_at: string;
}

export interface GroundFeature {
  ground_feature_object_id: string;
  object_cd: number; // 1=建物、2=道路、3=土砂災害、4=洪水浸水、5=土地利用
  latitude: number;
  longitude: number;
  height_m?: number;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T[];
  message?: string;
  status: number;
  timestamp: string;
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
      console.error(`BFF error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Failed to register route:', error);
    return null;
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
      console.error(`BFF error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch ground features:', error);
    return [];
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

// API接続状態を確認（BFF 経由）
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BFF_BASE}/connection_status`);
    return response.ok;
  } catch {
    return false;
  }
}
