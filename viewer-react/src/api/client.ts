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

// 6-11: 航路と交差する地物（1件ずつ）。6-2/6-2aで再抽出したメッシュ単位GeoJSONを
// 根拠に、viewer_api/app.pyのjudge_route_featuresがbboxロード＋水平重なり判定した
// 結果（class_label等はplateau_route_judgment.py参照）。
export type GroundFeatureGroup = 'impact' | 'opportunity' | 'landuse';

export interface GroundFeature {
  id: string;
  layer: string; // building / road / landslide / flood / landuse
  // 6-13: 「航路への影響」（building/road等）/「航路活用の可能性」
  // （landslide/flood）/土地利用（分類により変わる）の区分。
  group: GroundFeatureGroup;
  class_label: string | null;
  height_m?: number | null;
  // 交差判定文言（建物は高さ方向の判定文、それ以外は分類名を含む文章）。
  intersect: string;
}

// 6-11: 航路と交差しない地物は(レイヤ,分類)単位で集約した要約。密集レイヤ
// （洪水浸水等）でmargin範囲内に数百件になりうるため、個別行ではなく1文で示す。
export interface NearbyFeatureSummary {
  layer: string;
  group: GroundFeatureGroup;
  class_label: string | null;
  count: number;
  sentence: string;
}

export interface GroundFeatureResult {
  features: GroundFeature[];
  nearbySummary: NearbyFeatureSummary[];
  // 航路のAGLが航空法上の150m高度制限に抵触するかの判定文言。
  routeJudgment?: string;
  meta: PlateauDatasetMeta | null;
  // 6-12: 土砂災害・洪水浸水は区域データであって発災状況や飛行禁止の確定判断では
  // ないという免責。行ごとではなく「航路活用の可能性」グループの見出しに添える。
  landslideFloodDisclaimer?: string;
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
    return {
      features: data.data || [],
      nearbySummary: data.nearby_summary || [],
      routeJudgment: data.route_judgment,
      meta: parseDatasetMeta(data.meta),
      landslideFloodDisclaimer: data.landslide_flood_disclaimer,
    };
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

// 秩父市周辺の表示範囲（bbox）内の建物（6-5/6-6）。旧`/known_buildings`
// （固定29件、mesh 53397062限定）を置き換える。地図移動・ズームのたびに
// 現在の表示範囲で呼び直す想定のため、GeoJSON Featureをそのまま返す
// （footprintの[lat,lon]⇄[lon,lat]変換が不要になる）。6-9の決定により、
// `/known_buildings`は廃止しフロント側では呼ばない（BFF側のエンドポイント自体は
// 手動確認用に残置）。
export interface PlateauBuildingGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface PlateauBuildingFeature {
  type: 'Feature';
  id: string;
  geometry: PlateauBuildingGeometry;
  properties: {
    layer: 'building';
    // -9999センチネル等の欠測高さはBFF側でnullに変換済み（6-3）。
    height_m: number | null;
  };
}

// 6-6a/6-10: データセットの出典・データ時点。凡例・ポップアップに表示する
// （bboxエンドポイントのレスポンスに共通で付与される、メッシュファイルごとの
// 重複を避けるための一箇所管理の値）。
export interface PlateauDatasetMeta {
  source: string;
  dataDate: string;
}

export interface BboxFeatureResult<T> {
  features: T[];
  meta: PlateauDatasetMeta | null;
}

function parseDatasetMeta(raw: unknown): PlateauDatasetMeta | null {
  const meta = raw as { source?: string; data_date?: string } | undefined;
  if (!meta?.source || !meta?.data_date) return null;
  return { source: meta.source, dataDate: meta.data_date };
}

export async function getBuildingsInBbox(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  // 表示範囲を素早く動かした際、後から解決した古いリクエストが新しい表示範囲の
  // 結果を上書きしないよう、呼び出し側（App.tsx）が新しいリクエストを開始する
  // 前に古いリクエストを中断できるようにする（2026-08-18のレビュー指摘対応）。
  signal?: AbortSignal
): Promise<BboxFeatureResult<PlateauBuildingFeature>> {
  try {
    const params = new URLSearchParams({
      min_lat: String(minLat),
      max_lat: String(maxLat),
      min_lon: String(minLon),
      max_lon: String(maxLon),
    });
    const response = await fetch(`${BFF_BASE}/buildings?${params.toString()}`, { signal });
    if (!response.ok) {
      throw new Error(await describeError(response));
    }
    const data = await response.json();
    return { features: data.data || [], meta: parseDatasetMeta(data.meta) };
  } catch (error) {
    // 中断（AbortError）は呼び出し側が意図して起こした通常の動作のため、
    // 実際の取得失敗と違いコンソールへは出さない。呼び出し側は
    // signal.abortedを見て、中断時はこの戻り値（空配列）を使わない。
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { features: [], meta: null };
    }
    // 参照レイヤの取得失敗は航路登録・照会を妨げない。空配列を返し、表示だけを省略する。
    console.error('Failed to fetch buildings in bbox:', error);
    return { features: [], meta: null };
  }
}

// 秩父市周辺の表示範囲（bbox）内の道路・土砂災害・洪水浸水・土地利用（6-6a）。
// getBuildingsInBboxと同じ形。分類コードだけでなく人間可読な分類名
// （class_label等、BFF側でcodelistから解決済み）も含む。
export type GroundFeatureLayerKey = 'road' | 'landslide' | 'flood' | 'landuse';

export interface PlateauGroundFeature {
  type: 'Feature';
  id: string;
  geometry: PlateauBuildingGeometry;
  properties: {
    layer: GroundFeatureLayerKey;
    class_code: string | null;
    class_label: string | null;
    // 土砂災害のみ（警戒区域の指定状況）
    status_code?: string | null;
    status_label?: string | null;
    // 洪水浸水のみ（L1計画規模/L2想定最大規模）
    scale_code?: string | null;
    scale_label?: string | null;
  };
}

export async function getGroundFeaturesInBbox(
  layer: GroundFeatureLayerKey,
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  // getBuildingsInBboxと同じ理由（呼び出し側が古いリクエストを中断できるように）。
  signal?: AbortSignal
): Promise<BboxFeatureResult<PlateauGroundFeature>> {
  try {
    const params = new URLSearchParams({
      layer,
      min_lat: String(minLat),
      max_lat: String(maxLat),
      min_lon: String(minLon),
      max_lon: String(maxLon),
    });
    const response = await fetch(`${BFF_BASE}/ground_features_bbox?${params.toString()}`, { signal });
    if (!response.ok) {
      throw new Error(await describeError(response));
    }
    const data = await response.json();
    return { features: data.data || [], meta: parseDatasetMeta(data.meta) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { features: [], meta: null };
    }
    console.error(`Failed to fetch ground features (${layer}) in bbox:`, error);
    return { features: [], meta: null };
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
