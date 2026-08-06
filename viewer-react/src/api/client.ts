// Drone-web API クライアント
// 参照: 仕様書§6-2、実装タスク 3-2-2・3-2-3

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/airDtw/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'poc-key';

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

// 航路を登録
export async function registerRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  altitudeM: number
): Promise<DroneRoute | null> {
  try {
    const response = await fetch(`${API_BASE}/drone_route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
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
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data: ApiResponse<DroneRoute> = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Failed to register route:', error);
    return null;
  }
}

// 航路周辺の地物ボクセルを取得
export async function getGroundFeatures(
  latitude: number,
  longitude: number,
  radiusDegrees: number = 0.01
): Promise<GroundFeature[]> {
  try {
    const response = await fetch(
      `${API_BASE}/ground_feature_voxel?` +
        `latitude=${latitude}&longitude=${longitude}&radius=${radiusDegrees}`,
      {
        headers: {
          'X-API-Key': API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }

    const data: ApiResponse<GroundFeature> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch ground features:', error);
    return [];
  }
}

// 飛行禁止区域を取得
export async function getFlightProhibitedAreas(
  latitude: number,
  longitude: number,
  radiusDegrees: number = 0.01
) {
  try {
    const response = await fetch(
      `${API_BASE}/flight_prohibited_area?` +
        `latitude=${latitude}&longitude=${longitude}&radius=${radiusDegrees}`,
      {
        headers: {
          'X-API-Key': API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch prohibited areas:', error);
    return [];
  }
}

// API接続状態を確認
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: {
        'X-API-Key': API_KEY,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
