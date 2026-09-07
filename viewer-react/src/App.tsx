import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import CollapsibleSidebar from './components/CollapsibleSidebar';
import SettingsPanel from './components/SettingsPanel';
import MapContainer, { type MapBounds } from './components/MapContainer';
import ResultsOverlay, { type LoadingStage } from './components/ResultsOverlay';
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
  // 左ペイン結果オーバーレイ改善計画§5-2: showResults: boolean だけで
  // 「待機」「結果」「入力」を曖昧にしない。入力ビューに戻る操作（再入力する）は
  // このビュー状態だけを変え、queryResult・地図の確定表示は保持する（§3-5）。
  const [view, setView] = useState<'input' | 'loading' | 'result'>('input');
  // 待機オーバーレイの段階表示用。実際に到達した段階だけを進める（§3-3、
  // 完了していない段階を完了済みに見せない）。
  const [loadingStage, setLoadingStage] = useState<LoadingStage | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // §3-5: 地図に渡す航路は queryResult から独立させ、航路登録が実際に成功した
  // 時点でだけ更新する「最後に確定した航路」を持つ。queryResult.status を直接
  // 参照する実装だと、再照会のたびに status が一時的に 'loading' になり、
  // 直前の確定航路が待機中だけ地図から消えてしまう（レビュー指摘2026-09-07）。
  const [confirmedRoute, setConfirmedRoute] = useState<{
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
  } | null>(null);
  // 座標入力・航路登録に依存しない参照レイヤ。ルートを引いてから交差を確認する
  // のではなく、危険区域を先に見せてルート設計時に避けられるようにするため、
  // 起動時に一度だけ取得して常に地図へ表示する。
  const [knownProhibitedAreas, setKnownProhibitedAreas] = useState<KnownProhibitedArea[]>([]);
  const [knownProhibitedAreasLoaded, setKnownProhibitedAreasLoaded] = useState(false);
  // 秩父市周辺の表示範囲（bbox）内の建物（6-5/6-6）。地図移動・ズームに応じて
  // 現在の表示範囲だけ取得し直す。固定29件だった旧`/known_buildings`は廃止（6-9）。
  const [plateauBuildings, setPlateauBuildings] = useState<PlateauBuildingFeature[]>([]);
  const [initialBuildingsLoaded, setInitialBuildingsLoaded] = useState(false);
  // 6-6a: レイヤーキーごとの地物（道路・土砂災害・洪水浸水・土地利用）。
  const [groundFeaturesByLayer, setGroundFeaturesByLayer] = useState<
    Record<GroundFeatureLayerKey, PlateauGroundFeature[]>
  >({ road: [], landslide: [], flood: [], landuse: [] });
  const [initialGroundFeaturesLoaded, setInitialGroundFeaturesLoaded] = useState(false);
  // 6-10: データ出典・データ時点。bboxエンドポイントのレスポンスから得る
  // （建物・地物のどのレイヤーから来ても同じ値のため、最後に取得できたものを保持）。
  const [datasetMeta, setDatasetMeta] = useState<PlateauDatasetMeta | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const boundsFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groundFeaturesFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 表示範囲を素早く動かした際、後から解決した古いリクエストが新しい表示範囲の
  // 結果で上書きしてしまう問題への対応（2026-08-18のレビュー指摘）。次のeffect実行が
  // 開始する前のクリーンアップで、直前に発行したリクエストをここ経由で中断する。
  const buildingsFetchControllerRef = useRef<AbortController | null>(null);
  const groundFeaturesFetchControllerRef = useRef<AbortController | null>(null);
  // 直近に実際取得した（バッファ込みの）bbox。次のmapBoundsがこの範囲に収まって
  // いれば、表示中のデータで足りるため取得自体をスキップする。
  const lastFetchedBuildingsBoundsRef = useRef<MapBounds | null>(null);
  // レイヤーごとに直近取得済みのbboxを持つ。ON/OFFの組み合わせ全体を1本の値に
  // まとめていた旧実装は、無関係なレイヤーを1つ切り替えただけでも全レイヤー分を
  // 再取得してしまっていた（ユーザー指摘2026-08-19：「都度fetch」が土砂災害・
  // 洪水浸水の表示不安定の原因）。
  const lastFetchedGroundFeaturesBoundsRef = useRef<Partial<Record<GroundFeatureLayerKey, MapBounds>>>({});

  const refreshConnection = useCallback(async () => {
    setConnection(await getConnectionStatus());
  }, []);

  // 待機オーバーレイの経過時間表示（§3-3「実装可能な範囲での経過時間」）。
  useEffect(() => {
    if (view !== 'loading') return;
    setElapsedSeconds(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view]);

  // 起動時に接続状態を確認する。これが無いと、登録と照会の両方が成功するまで
  // 画面は Disconnected のままになり、接続の問題か入力の問題か切り分けられない。
  useEffect(() => {
    void refreshConnection();
  }, [refreshConnection]);

  useEffect(() => {
    let active = true;
    void getKnownProhibitedAreas()
      .then((areas) => {
        if (active) setKnownProhibitedAreas(areas);
      })
      .catch(() => {
        // ローダーを永久に残さず、取得失敗時も地図本体は表示する。
      })
      .finally(() => {
        if (active) setKnownProhibitedAreasLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // MapContainerから表示範囲（bbox）の変化を受け取る（初回表示・移動・ズーム）。
  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // 建物レイヤーONの間だけ、表示範囲が変わるたびに/buildingsを取得し直す（6-6）。
  // OFFのときは取得自体を行わない（6-7）。連続したbounds変化はデバウンスして
  // 最後の1回だけ実際に取得する。
  useEffect(() => {
    // OFF中はキャッシュ（plateauBuildings・lastFetchedBuildingsBoundsRef）を破棄
    // しない。破棄すると同じ範囲でON/OFFを繰り返すだけで毎回再取得が発生していた
    // （ユーザー指摘2026-08-19）。非表示自体はMapContainer側がshowBuildingsで
    // 行うため、ここでは取得を止めるだけでよい。
    if (!showBuildings) {
      setInitialBuildingsLoaded(true);
      return;
    }
    if (!mapBounds) return;
    // 既に読み込み済みのバッファ範囲に収まる移動なら、表示中のデータで足りるため
    // 取得しない（手でわずかにドラッグするたびに再取得・再描画が走る問題への対応）。
    if (
      lastFetchedBuildingsBoundsRef.current &&
      boundsContain(lastFetchedBuildingsBoundsRef.current, mapBounds)
    ) {
      setInitialBuildingsLoaded(true);
      return;
    }
    if (boundsFetchTimer.current) clearTimeout(boundsFetchTimer.current);
    boundsFetchTimer.current = setTimeout(() => {
      const fetchBounds = padBounds(mapBounds, VIEWPORT_BUFFER_RATIO);
      const controller = new AbortController();
      buildingsFetchControllerRef.current = controller;
      void getBuildingsInBbox(
        fetchBounds.minLat,
        fetchBounds.maxLat,
        fetchBounds.minLon,
        fetchBounds.maxLon,
        controller.signal
      )
        .then(({ features, meta, ok }) => {
        // 中断済み（＝この後により新しい表示範囲のリクエストが発行済み）なら、
        // 古い結果で状態を上書きしない。キャッシュへの書き込みも成功後にのみ行う
        // （2026-08-19、reviewer(Codex)指摘：成功前にキャッシュへ書くと、abortされた
        // ときに「取得済みだが中身は空」のまま固定され、以後再取得されなくなる
        // バグがあった）。okもあわせて見るのは、通信失敗時も`getBuildingsInBbox`は
        // 例外を投げず空配列で解決するため（表示だけを省略し航路照会は妨げない設計）、
        // signal.abortedだけでは通信失敗を「成功・0件」と区別できないため
        // （2026-08-19、reviewer(Codex)指摘）。失敗時は表示を空にせず、直前の
        // データを残したまま次回に再取得を試みる。
          if (controller.signal.aborted) return;
          if (ok) {
            lastFetchedBuildingsBoundsRef.current = fetchBounds;
            setPlateauBuildings(features);
            if (meta) setDatasetMeta(meta);
          }
          setInitialBuildingsLoaded(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) setInitialBuildingsLoaded(true);
        });
    }, BOUNDS_FETCH_DEBOUNCE_MS);
    return () => {
      if (boundsFetchTimer.current) clearTimeout(boundsFetchTimer.current);
      buildingsFetchControllerRef.current?.abort();
    };
  }, [showBuildings, mapBounds]);

  // 6-6a: 道路・土砂災害・洪水浸水・土地利用も同じ考え方で、ONかつキャッシュが
  // 現在の表示範囲をカバーしていないレイヤーだけ取得し直す。複数レイヤーの取得は
  // 1回のデバウンスにまとめるが、キャッシュ済みのレイヤーは対象から外す（6-7:
  // OFFのレイヤーは取得しない。OFF中もデータは破棄せず、再ONの際に同じ範囲なら
  // 再取得しない。ユーザー指摘2026-08-19：全レイヤーを1本のキーで管理していた旧
  // 実装は、1レイヤーだけの切り替えでも他レイヤーまで巻き込んで再取得していた）。
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
    if (enabledLayers.length === 0) {
      setInitialGroundFeaturesLoaded(true);
      return;
    }
    if (!mapBounds) return;

    // 有効なレイヤーのうち、直近取得済みのbboxが現在の表示範囲をカバーしていない
    // ものだけ取得対象にする（手で少し動かすたびに再取得・再描画が走る問題への
    // 対応、2026-08-17報告。レイヤー単位のキャッシュにしたのは2026-08-19）。
    const layersToFetch = enabledLayers.filter((layer) => {
      const cached = lastFetchedGroundFeaturesBoundsRef.current[layer];
      return !(cached && boundsContain(cached, mapBounds));
    });
    if (layersToFetch.length === 0) {
      setInitialGroundFeaturesLoaded(true);
      return;
    }

    if (groundFeaturesFetchTimer.current) clearTimeout(groundFeaturesFetchTimer.current);
    groundFeaturesFetchTimer.current = setTimeout(() => {
      const fetchBounds = padBounds(mapBounds, VIEWPORT_BUFFER_RATIO);
      const controller = new AbortController();
      groundFeaturesFetchControllerRef.current = controller;
      void Promise.all(
        layersToFetch.map((layer) =>
          getGroundFeaturesInBbox(
            layer,
            fetchBounds.minLat,
            fetchBounds.maxLat,
            fetchBounds.minLon,
            fetchBounds.maxLon,
            controller.signal
          ).then((result) => [layer, result] as const)
        )
      )
        .then((results) => {
        // abort済みならキャッシュにも書かない（2026-08-19、reviewer(Codex)指摘：
        // 成功前にキャッシュへ書き込んでいたため、abortされたレイヤーが「取得済みだが
        // 中身は空」のまま固定され、道路・建物を含め何も表示されなくなるバグがあった。
        // 建物取得effectも同じ理由で同様に修正済み）。
          if (controller.signal.aborted) return;
        // レイヤーごとにokを見る（Promise.allは一括だが、通信失敗した個別のレイヤーは
        // `getGroundFeaturesInBbox`が例外を投げず空配列で解決するため、abortと同様
        // signal.abortedだけでは区別できない。2026-08-19、reviewer(Codex)指摘）。
        // 失敗したレイヤーはキャッシュも表示も更新せず、直前のデータを残したまま
        // 次回に再取得を試みる。
          const succeeded = results.filter(([, r]) => r.ok);
          for (const [layer] of succeeded) {
            lastFetchedGroundFeaturesBoundsRef.current[layer] = fetchBounds;
          }
          if (succeeded.length > 0) {
            setGroundFeaturesByLayer((prev) => {
              const next = { ...prev };
              for (const [layer, { features }] of succeeded) next[layer] = features;
              return next;
            });
            const lastMeta = succeeded.map(([, r]) => r.meta).find((m) => m !== null);
            if (lastMeta) setDatasetMeta(lastMeta);
          }
          setInitialGroundFeaturesLoaded(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) setInitialGroundFeaturesLoaded(true);
        });
    }, BOUNDS_FETCH_DEBOUNCE_MS);
    return () => {
      if (groundFeaturesFetchTimer.current) clearTimeout(groundFeaturesFetchTimer.current);
      groundFeaturesFetchControllerRef.current?.abort();
    };
    // layerVisibilityKeyがON/OFFの組み合わせを表す安定した文字列なので、これを
    // 依存にしてlayerVisibilityオブジェクト自体（毎レンダー新規生成）は依存に入れない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerVisibilityKey, mapBounds]);

  const handleQuery = async () => {
    setIsLoading(true);
    setView('loading');
    setLoadingStage('register');
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
        // 航路登録が成功した時点の値で確定航路を更新する。地図はここでだけ
        // 更新され、以降このクエリが待機・失敗しても直前の確定航路のままになる。
        setConfirmedRoute({ startLat, startLon, endLat, endLon });
      } catch (error) {
        setQueryResult({
          status: 'error',
          message: error instanceof Error ? error.message : '航路登録に失敗しました',
        });
        return;
      }

      // 航路はすでに登録済み。ここで失敗しても登録自体は取り消されないので、
      // 「登録は成功・照会は失敗」を partial として区別して表示する。
      setLoadingStage('features');
      try {
        const { features, nearbySummary, routeJudgment, meta, landslideFloodDisclaimer } =
          await getGroundFeatures(startLat, startLon, endLat, endLon, aglM);

        // 飛行禁止区域は別のLaravelエンドポイント（general_purpose）経由のため、
        // 地物照会とは独立に成否を扱う。ここが失敗しても地物照会の結果は握りつぶさない。
        setLoadingStage('prohibited');
        let prohibitedAreas: ProhibitedArea[] = [];
        let prohibitedError: string | undefined;
        try {
          prohibitedAreas = await getFlightProhibitedAreas(startLat, startLon, endLat, endLon);
        } catch (error) {
          prohibitedError = error instanceof Error ? error.message : '不明なエラー';
        }

        // 「結果を整理」段階は置かない：この直後に setQueryResult で結果へ
        // 遷移するため、React のバッチ更新により待機画面へ描画される機会が
        // 無く実際には表示されない（レビュー指摘2026-09-07）。
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
      setLoadingStage(null);
      // 成功・一部成功・失敗のいずれでも結果ビューへ切り替える（§5-2）。
      setView('result');
      void refreshConnection();
    }
  };

  // 「再入力する」：ビューだけを input に戻す。queryResult・地図の確定航路は
  // 変更しない（§3-5：idle化すると直前の確定航路まで消える可能性があるため）。
  const handleReenter = useCallback(() => {
    setView('input');
  }, []);

  // 待機オーバーレイの「対象レイヤ」表示用（§3-3）。座標入力・登録操作とは
  // 無関係なので、ここで毎レンダー計算しても他の副作用には影響しない。
  const activeLayerLabels = [
    showBuildings && '建物',
    showRoad && '道路',
    showLandslide && '土砂災害警戒区域',
    showFlood && '洪水浸水想定区域',
    showLanduse && '土地利用',
    showProhibitedAreas && '人口集中地区（飛行禁止）',
  ].filter((label): label is string => Boolean(label));

  // 地図には「最後に確定した航路」（confirmedRoute）を渡す。queryResult.status
  // からではなく状態そのものが安定した参照なので、routeRegistered・useMemoに
  // よる再計算は不要（layerVisibility等と同じ「無駄な再発火を防ぐ」目的も
  // confirmedRouteの更新頻度が低いことで自然に満たされる）。
  const routeData = confirmedRoute;
  const initialMapLayersReady =
    mapBounds !== null &&
    knownProhibitedAreasLoaded &&
    initialBuildingsLoaded &&
    initialGroundFeaturesLoaded;

  return (
    // overflow-hidden: 内部の何かがわずかにはみ出しても（境界線・パディングの
    // 端数px等）ページ全体のスクロールとして漏れ出さないようにする防御的な
    // 指定。h-screen ちょうどの高さに配置している「再入力する」フッター
    // （ResultsOverlay）が、ページ全体のスクロール分だけ最下部からずれて
    // 見える事態を確実に防ぐ（ユーザー報告2026-09-07を受けて追加。実測では
    // 元々ページのはみ出しは無かったが、再発防止として維持する）。
    <div className="flex flex-col h-screen overflow-hidden bg-bg-app">
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left settings panel: GISアプリ風に幅だけを開閉し、地図領域は常に残す。
            左ペイン結果オーバーレイ改善計画§5-3: relative h-full のラッパー内に、
            入力ビューと結果オーバーレイを兄弟要素として重ねる。CollapsibleSidebar
            自体は既存の relative aside / overflow-hidden をそのまま使えるため
            変更しない。 */}
        <CollapsibleSidebar>
          <div className="relative h-full">
            {/* view!=='input' の間は、入力フォームをポインタ操作・Tab移動・
                支援技術のいずれからも到達不可能にする（§5-2）。inert は視覚的な
                非表示だけでなく、実際にフォーカス・ヒットテストの対象から外す。 */}
            <div className="h-full" inert={view !== 'input'} aria-hidden={view !== 'input'}>
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
            </div>

            {view !== 'input' && (
              <ResultsOverlay
                queryResult={queryResult}
                showProhibitedAreas={showProhibitedAreas}
                loadingStage={loadingStage}
                elapsedSeconds={elapsedSeconds}
                activeLayerLabels={activeLayerLabels}
                onReenter={handleReenter}
                onRetry={handleQuery}
              />
            )}
          </div>
        </CollapsibleSidebar>

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
            initialLayersReady={initialMapLayersReady}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
