import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import SettingsPanel from './components/SettingsPanel';
import MapContainer, { type MapBounds } from './components/MapContainer';
import ResultsPanel from './components/ResultsPanel';
import {
  registerRoute,
  getGroundFeatures,
  getFlightProhibitedAreas,
  getBuildingsInBbox,
  getGroundFeaturesInBbox,
  getKnownProhibitedAreas,
  getConnectionStatus,
  type ConnectionStatus,
  type GroundFeature,
  type GroundFeatureLayerKey,
  type NearbyFeatureSummary,
  type PlateauBuildingFeature,
  type PlateauDatasetMeta,
  type PlateauGroundFeature,
  type ProhibitedArea,
  type KnownProhibitedArea,
} from './api/client';

// 地図移動中に発生する連続したmoveendのたびに毎回bboxエンドポイントを叩かないための
// デバウンス時間（6-7: 不要な追加取得を行わない）。
const BOUNDS_FETCH_DEBOUNCE_MS = 300;

// 6-6a: 建物以外にbboxで取得・表示する地物レイヤー。
const GROUND_FEATURE_LAYERS: GroundFeatureLayerKey[] = ['road', 'landslide', 'flood', 'landuse'];

// 表示範囲そのものではなく、上下左右にこの比率だけ広げたbboxを先読みする
// （ビューポートバッファリング）。少しドラッグしただけでも表示範囲bboxの数値は
// 必ず変わるため、バッファ無しだと手で動かすたびに再取得・再描画が走ってしまう
// （ユーザー報告2026-08-17）。読み込み済みバッファの中に収まる移動は取得済みの
// データで足りるため、取得自体をスキップする。比率を大きくしすぎると、bboxが
// 一度に読み込めるメッシュ数の上限（plateau_buildings.MAX_MESHES_PER_REQUEST=200）
// に近づいたときに400エラーで無言で空表示になりやすくなるため、控えめな値にする。
const VIEWPORT_BUFFER_RATIO = 0.5;

function padBounds(bounds: MapBounds, ratio: number): MapBounds {
  const latPad = (bounds.maxLat - bounds.minLat) * ratio;
  const lonPad = (bounds.maxLon - bounds.minLon) * ratio;
  return {
    minLat: bounds.minLat - latPad,
    maxLat: bounds.maxLat + latPad,
    minLon: bounds.minLon - lonPad,
    maxLon: bounds.maxLon + lonPad,
  };
}

function boundsContain(outer: MapBounds, inner: MapBounds): boolean {
  return (
    outer.minLat <= inner.minLat &&
    outer.maxLat >= inner.maxLat &&
    outer.minLon <= inner.minLon &&
    outer.maxLon >= inner.maxLon
  );
}

// partial = 航路登録は成功したが地物照会・飛行禁止区域照会のいずれかが失敗した状態。
// これを success に含めると「0件」と「照会失敗」が見分けられなくなる。
export interface QueryResult {
  status: 'idle' | 'loading' | 'success' | 'partial' | 'error';
  routeId?: string;
  features?: GroundFeature[];
  // 6-11: 航路と交差しない地物の(レイヤ,分類)単位の要約文。
  nearbySummary?: NearbyFeatureSummary[];
  // 航路AGLの150m高度制限判定（viewer/src/altitude.pyをBFF経由で適用）。
  routeJudgment?: string;
  // DID地区（人口集中地区）等の飛行禁止区域。実APIはポリゴンを返さないため
  // 交差判定は常に「要確認（ジオメトリ未提供）」になる。
  prohibitedAreas?: ProhibitedArea[];
  // 6-10: データ出典・データ時点。
  datasetMeta?: PlateauDatasetMeta | null;
  // 6-12: 土砂災害・洪水浸水は区域データであって発災状況や飛行禁止の確定判断では
  // ないという免責。
  landslideFloodDisclaimer?: string;
  timestamp?: string;
  message?: string;
}

function App() {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [startLat, setStartLat] = useState(35.975841);
  const [startLon, setStartLon] = useState(139.065854);
  const [endLat, setEndLat] = useState(35.988390);
  const [endLon, setEndLon] = useState(139.046579);
  const [aglM, setAglM] = useState(100.0);
  const [showRoute, setShowRoute] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showProhibitedAreas, setShowProhibitedAreas] = useState(true);
  // 6-6a: 建物以外の4レイヤー（道路・土砂災害・洪水浸水・土地利用）のON/OFF。
  const [showRoad, setShowRoad] = useState(true);
  const [showLandslide, setShowLandslide] = useState(true);
  const [showFlood, setShowFlood] = useState(true);
  // 土地利用は隙間なく面を埋め尽くす描画で他レイヤより体感が重いため（2026-08-17実測、
  // 進捗ログ参照）、初期状態は非表示にしてユーザーが必要な時だけチェックを入れる運用にする
  // （ユーザー指示 2026-08-18）。
  const [showLanduse, setShowLanduse] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);
  // 座標入力・航路登録に依存しない参照レイヤ。ルートを引いてから交差を確認する
  // のではなく、危険区域を先に見せてルート設計時に避けられるようにするため、
  // 起動時に一度だけ取得して常に地図へ表示する。
  const [knownProhibitedAreas, setKnownProhibitedAreas] = useState<KnownProhibitedArea[]>([]);
  // 秩父市周辺の表示範囲（bbox）内の建物（6-5/6-6）。地図移動・ズームに応じて
  // 現在の表示範囲だけ取得し直す。固定29件だった旧`/known_buildings`は廃止（6-9）。
  const [plateauBuildings, setPlateauBuildings] = useState<PlateauBuildingFeature[]>([]);
  // 6-6a: レイヤーキーごとの地物（道路・土砂災害・洪水浸水・土地利用）。
  const [groundFeaturesByLayer, setGroundFeaturesByLayer] = useState<
    Record<GroundFeatureLayerKey, PlateauGroundFeature[]>
  >({ road: [], landslide: [], flood: [], landuse: [] });
  // 6-10: データ出典・データ時点。bboxエンドポイントのレスポンスから得る
  // （建物・地物のどのレイヤーから来ても同じ値のため、最後に取得できたものを保持）。
  const [datasetMeta, setDatasetMeta] = useState<PlateauDatasetMeta | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const boundsFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groundFeaturesFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 直近に実際取得した（バッファ込みの）bbox。次のmapBoundsがこの範囲に収まって
  // いれば、表示中のデータで足りるため取得自体をスキップする。
  const lastFetchedBuildingsBoundsRef = useRef<MapBounds | null>(null);
  const lastFetchedGroundFeaturesBoundsRef = useRef<{ bounds: MapBounds; layerVisibilityKey: string } | null>(
    null
  );

  const refreshConnection = useCallback(async () => {
    setConnection(await getConnectionStatus());
  }, []);

  // 起動時に接続状態を確認する。これが無いと、登録と照会の両方が成功するまで
  // 画面は Disconnected のままになり、接続の問題か入力の問題か切り分けられない。
  useEffect(() => {
    void refreshConnection();
  }, [refreshConnection]);

  useEffect(() => {
    void getKnownProhibitedAreas().then(setKnownProhibitedAreas);
  }, []);

  // MapContainerから表示範囲（bbox）の変化を受け取る（初回表示・移動・ズーム）。
  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // 建物レイヤーONの間だけ、表示範囲が変わるたびに/buildingsを取得し直す（6-6）。
  // OFFのときは取得自体を行わない（6-7）。連続したbounds変化はデバウンスして
  // 最後の1回だけ実際に取得する。
  useEffect(() => {
    if (!showBuildings || !mapBounds) {
      setPlateauBuildings([]);
      lastFetchedBuildingsBoundsRef.current = null;
      return;
    }
    // 既に読み込み済みのバッファ範囲に収まる移動なら、表示中のデータで足りるため
    // 取得しない（手でわずかにドラッグするたびに再取得・再描画が走る問題への対応）。
    if (
      lastFetchedBuildingsBoundsRef.current &&
      boundsContain(lastFetchedBuildingsBoundsRef.current, mapBounds)
    ) {
      return;
    }
    if (boundsFetchTimer.current) clearTimeout(boundsFetchTimer.current);
    boundsFetchTimer.current = setTimeout(() => {
      const fetchBounds = padBounds(mapBounds, VIEWPORT_BUFFER_RATIO);
      lastFetchedBuildingsBoundsRef.current = fetchBounds;
      void getBuildingsInBbox(
        fetchBounds.minLat,
        fetchBounds.maxLat,
        fetchBounds.minLon,
        fetchBounds.maxLon
      ).then(({ features, meta }) => {
        setPlateauBuildings(features);
        if (meta) setDatasetMeta(meta);
      });
    }, BOUNDS_FETCH_DEBOUNCE_MS);
    return () => {
      if (boundsFetchTimer.current) clearTimeout(boundsFetchTimer.current);
    };
  }, [showBuildings, mapBounds]);

  // 6-6a: 道路・土砂災害・洪水浸水・土地利用も同じ考え方で、ONのレイヤーだけ
  // 表示範囲が変わるたびに取得し直す。4レイヤーまとめて1回デバウンスし、
  // 有効なものだけ並行取得する（6-7: OFFのレイヤーは取得しない）。
  //
  // useMemoで包まないと、mapBoundsの更新（＝地図を動かすたび）を含むAppの
  // 再レンダーのたびにこのオブジェクトが新しい参照として作られ、MapContainer側の
  // 「表示範囲・レイヤー変更を検知するeffect」が値の変化なしに毎回発火して
  // setData()が呼ばれ続け、地図がちらつく不具合の原因になっていた
  // （ユーザー報告2026-08-17、setData化＝コミット5dc6603だけでは解消しなかった）。
  const layerVisibility = useMemo<Record<GroundFeatureLayerKey, boolean>>(
    () => ({ road: showRoad, landslide: showLandslide, flood: showFlood, landuse: showLanduse }),
    [showRoad, showLandslide, showFlood, showLanduse]
  );
  const layerVisibilityKey = GROUND_FEATURE_LAYERS.map((l) => (layerVisibility[l] ? '1' : '0')).join('');

  useEffect(() => {
    const enabledLayers = GROUND_FEATURE_LAYERS.filter((l) => layerVisibility[l]);
    setGroundFeaturesByLayer((prev) => {
      // 実際にOFFへ切り替わって中身が空になるレイヤーが無ければprevをそのまま
      // 返す。{...prev}のスプレッドは中身が同じでも常に新しい参照を作ってしまい、
      // 上と同じ理由でMapContainer側のちらつきにつながるため、変更が無い限り
      // 新しいオブジェクトを作らない。
      let changed = false;
      const next = { ...prev };
      for (const layer of GROUND_FEATURE_LAYERS) {
        if (!layerVisibility[layer] && prev[layer].length > 0) {
          next[layer] = [];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (enabledLayers.length === 0 || !mapBounds) return;

    // 建物と同じ考え方：有効なレイヤーの組み合わせが前回取得時と同じで、かつ
    // 表示範囲が読み込み済みバッファに収まっていれば取得しない（手で少し動かす
    // たびに再取得・再描画が走る問題への対応、2026-08-17報告）。
    const lastFetch = lastFetchedGroundFeaturesBoundsRef.current;
    if (
      lastFetch &&
      lastFetch.layerVisibilityKey === layerVisibilityKey &&
      boundsContain(lastFetch.bounds, mapBounds)
    ) {
      return;
    }

    if (groundFeaturesFetchTimer.current) clearTimeout(groundFeaturesFetchTimer.current);
    groundFeaturesFetchTimer.current = setTimeout(() => {
      const fetchBounds = padBounds(mapBounds, VIEWPORT_BUFFER_RATIO);
      lastFetchedGroundFeaturesBoundsRef.current = { bounds: fetchBounds, layerVisibilityKey };
      void Promise.all(
        enabledLayers.map((layer) =>
          getGroundFeaturesInBbox(
            layer,
            fetchBounds.minLat,
            fetchBounds.maxLat,
            fetchBounds.minLon,
            fetchBounds.maxLon
          ).then((result) => [layer, result] as const)
        )
      ).then((results) => {
        setGroundFeaturesByLayer((prev) => {
          const next = { ...prev };
          for (const [layer, { features }] of results) next[layer] = features;
          return next;
        });
        const lastMeta = results.map(([, r]) => r.meta).find((m) => m !== null);
        if (lastMeta) setDatasetMeta(lastMeta);
      });
    }, BOUNDS_FETCH_DEBOUNCE_MS);
    return () => {
      if (groundFeaturesFetchTimer.current) clearTimeout(groundFeaturesFetchTimer.current);
    };
    // layerVisibilityKeyがON/OFFの組み合わせを表す安定した文字列なので、これを
    // 依存にしてlayerVisibilityオブジェクト自体（毎レンダー新規生成）は依存に入れない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerVisibilityKey, mapBounds]);

  const handleQuery = async () => {
    setIsLoading(true);
    setQueryResult({ status: 'loading' });

    try {
      let routeId: string;
      try {
        const route = await registerRoute(startLat, startLon, endLat, endLon, aglM);
        if (!route) {
          setQueryResult({ status: 'error', message: 'BFF が航路データを返しませんでした' });
          return;
        }
        routeId = route.id;
      } catch (error) {
        setQueryResult({
          status: 'error',
          message: error instanceof Error ? error.message : '航路登録に失敗しました',
        });
        return;
      }

      // 航路はすでに登録済み。ここで失敗しても登録自体は取り消されないので、
      // 「登録は成功・照会は失敗」を partial として区別して表示する。
      try {
        const { features, nearbySummary, routeJudgment, meta, landslideFloodDisclaimer } =
          await getGroundFeatures(startLat, startLon, endLat, endLon, aglM);

        // 飛行禁止区域は別のLaravelエンドポイント（general_purpose）経由のため、
        // 地物照会とは独立に成否を扱う。ここが失敗しても地物照会の結果は握りつぶさない。
        let prohibitedAreas: ProhibitedArea[] = [];
        let prohibitedError: string | undefined;
        try {
          prohibitedAreas = await getFlightProhibitedAreas(startLat, startLon, endLat, endLon);
        } catch (error) {
          prohibitedError = error instanceof Error ? error.message : '不明なエラー';
        }

        setQueryResult({
          status: prohibitedError ? 'partial' : 'success',
          routeId,
          features,
          nearbySummary,
          routeJudgment,
          prohibitedAreas,
          datasetMeta: meta,
          landslideFloodDisclaimer,
          timestamp: new Date().toISOString(),
          message: prohibitedError
            ? `航路・周辺地物は取得できましたが、飛行禁止区域の照会に失敗しました: ${prohibitedError}`
            : undefined,
        });
      } catch (error) {
        setQueryResult({
          status: 'partial',
          routeId,
          timestamp: new Date().toISOString(),
          message: `航路は登録できましたが、地物照会に失敗しました: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`,
        });
      }
    } finally {
      setIsLoading(false);
      void refreshConnection();
    }
  };

  // 航路が登録できていれば（partial でも）地図には描画する。
  const routeRegistered =
    queryResult.status === 'success' || queryResult.status === 'partial';

  // layerVisibility・groundFeaturesByLayer（2026-08-17）と同じ理由で、この参照を
  // 安定させる。ここが毎回新規オブジェクトだと、登録操作と無関係な再レンダリング
  // （レイヤーOFF/ON等）のたびにMapContainer側の航路描画effect・地図中心移動effectが
  // 無駄に再発火してしまう。
  const routeData = useMemo(
    () => (routeRegistered ? { startLat, startLon, endLat, endLon } : null),
    [routeRegistered, startLat, startLon, endLat, endLon]
  );

  return (
    <div className="flex flex-col h-screen bg-bg-app">
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left settings panel */}
        <SettingsPanel
          connection={connection}
          startLat={startLat}
          setStartLat={setStartLat}
          startLon={startLon}
          setStartLon={setStartLon}
          endLat={endLat}
          setEndLat={setEndLat}
          endLon={endLon}
          setEndLon={setEndLon}
          aglM={aglM}
          setAglM={setAglM}
          showRoute={showRoute}
          setShowRoute={setShowRoute}
          showBuildings={showBuildings}
          setShowBuildings={setShowBuildings}
          showProhibitedAreas={showProhibitedAreas}
          setShowProhibitedAreas={setShowProhibitedAreas}
          showRoad={showRoad}
          setShowRoad={setShowRoad}
          showLandslide={showLandslide}
          setShowLandslide={setShowLandslide}
          showFlood={showFlood}
          setShowFlood={setShowFlood}
          showLanduse={showLanduse}
          setShowLanduse={setShowLanduse}
          onQuery={handleQuery}
          isLoading={isLoading}
        />

        {/* Map area */}
        <div className="flex-1 flex flex-col">
          <MapContainer
            // 地図の初期表示位置。従来は秩父市中心付近の固定値だったが、始点・終点の
            // デフォルト値を変更した際に無関係な位置になってしまったため、デフォルトの
            // 始点・終点の中間地点を初期中心にする（ユーザー指示 2026-08-18、PoCのため
            // 簡易対応）。マウント時の1回だけ使われる値なのでuseMemo等は不要。
            initialCenter={[(startLon + endLon) / 2, (startLat + endLat) / 2]}
            routeData={routeData}
            showRoute={showRoute}
            buildingFeatures={plateauBuildings}
            showBuildings={showBuildings}
            onBoundsChange={handleBoundsChange}
            prohibitedAreas={knownProhibitedAreas}
            showProhibitedAreas={showProhibitedAreas}
            groundFeaturesByLayer={groundFeaturesByLayer}
            layerVisibility={layerVisibility}
            datasetMeta={datasetMeta}
          />

          {/* Bottom results panel: 「航路を登録して周辺データを照会」を押すまでは
              パネル自体を出さない（ユーザー指示 2026-08-18）。押下でqueryResult.status
              がidleから変わるので、それを表示条件にする。 */}
          {queryResult.status !== 'idle' && (
            <ResultsPanel queryResult={queryResult} showProhibitedAreas={showProhibitedAreas} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
