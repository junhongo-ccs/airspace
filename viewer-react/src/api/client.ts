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
  // 交差判定文言（viewer/src/altitude.pyの判定をBFFが付与）。建物は高さ方向、
  // それ以外はジオメトリ未提供のため簡易表現になる。
  intersect?: string;
  // 地図描画用フットプリント（[lat, lon]の閉じたリング）。Phase B投入分の建物のみ
  // 持つ。無ければ地図には描画しない。
  footprint?: [number, number][] | null;
  raw?: unknown;
}

export interface GroundFeatureResult {
  features: GroundFeature[];
  // 航路のAGLが航空法上の150m高度制限に抵触するかの判定文言。
  routeJudgment?: string;
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
  return `BFFがHTTP ${response.status}を返しました`;
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
// 始点のみだとStreamlit版（航路全体の中点基準）と空間IDが1タイルずれて0件に
// なることがあったため、始点・終点の両方を渡してbboxを作らせる。
export async function getGroundFeatures(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  altitudeM?: number,
  marginDegrees: number = 0.01
): Promise<GroundFeatureResult> {
  try {
    const response = await fetch(`${BFF_BASE}/query_features`, {
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
        margin_degrees: marginDegrees,
      }),
    });

    if (!response.ok) {
      // 空配列を返すと「照会成功・0件」と区別が付かず、Laravel照会の失敗が
      // 正常な結果として画面に出てしまう。登録と同様に失敗として扱う。
      throw new Error(await describeError(response));
    }

    const data = await response.json();
    return { features: data.data || [], routeJudgment: data.route_judgment };
  } catch (error) {
    console.error('Failed to fetch ground features:', error);
    throw error;
  }
}

// BFF が返すDID地区（人口集中地区）等の飛行禁止区域。実APIレスポンス自体には
// ポリゴンが含まれないが、DID地区は安定ID（flightProhibitedAreaId）を持つため
// 国土数値情報から再取得したジオメトリをBFF側で突き合わせている（他レイヤは
// ランダムUUID採番のため引き続きrings無し＝地図描画できない）。
export interface ProhibitedArea {
  id: string;
  name?: string | null;
  source: string;
  is_poc: boolean;
  intersect?: string;
  // 地図描画用（[lat, lon]の閉じたリング複数、MultiPolygon）。DID地区のみ持つ。
  rings?: [number, number][][] | null;
  raw?: unknown;
}

// 航路周辺のDID地区（人口集中地区）等の飛行禁止区域を取得（BFF 経由）。
// 既定の航路座標とDID地区（国土数値情報A16-2020、秩父市）は約3km離れているため、
// 既定の座標のままでは0件が正しい結果になる（仕様書§7-2-補参照）。
export async function getFlightProhibitedAreas(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  marginDegrees: number = 0.01
): Promise<ProhibitedArea[]> {
  try {
    const response = await fetch(`${BFF_BASE}/query_prohibited_areas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_latitude: startLat,
        start_longitude: startLon,
        end_latitude: endLat,
        end_longitude: endLon,
        margin_degrees: marginDegrees,
      }),
    });

    if (!response.ok) {
      // 空配列を返すと「照会成功・0件」と区別が付かなくなる。他の照会と同様、
      // 失敗として投げる。
      throw new Error(await describeError(response));
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch prohibited areas:', error);
    throw error;
  }
}

// ジオメトリを再取得済みの飛行禁止区域（現状DID地区のみ）。座標入力・航路登録に
// 依存しない静的な参照データで、Laravelへの照会を伴わない。ルート設計前から
// 危険区域を地図に表示できるようにするための参照レイヤ用。
export interface KnownProhibitedArea {
  id: string;
  name?: string | null;
  rings: [number, number][][];
}

// 地図描画用に外形を保持している建物。現状はPLATEAU秩父市2025のPhase B投入分29件。
export interface KnownBuilding extends GroundFeature {
  layer: 'building';
  footprint: [number, number][];
}

export async function getKnownBuildings(): Promise<KnownBuilding[]> {
  try {
    const response = await fetch(`${BFF_BASE}/known_buildings`);
    if (!response.ok) {
      throw new Error(await describeError(response));
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    // 参照レイヤの取得失敗は航路登録・照会を妨げない。空配列を返し、表示だけを省略する。
    console.error('Failed to fetch known buildings:', error);
    return [];
  }
}

export async function getKnownProhibitedAreas(): Promise<KnownProhibitedArea[]> {
  try {
    const response = await fetch(`${BFF_BASE}/known_prohibited_areas`);
    if (!response.ok) {
      throw new Error(await describeError(response));
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    // 参照レイヤの取得失敗は致命的ではない（航路登録・照会自体は続行できる）ため、
    // 他の照会関数と異なり空配列を返し、画面が使えなくなることを避ける。
    console.error('Failed to fetch known prohibited areas:', error);
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
      message: error instanceof Error ? error.message : 'BFFに接続できません',
    };
  }
}
