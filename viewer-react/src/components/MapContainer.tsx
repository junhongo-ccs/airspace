import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  GroundFeatureLayerKey,
  KnownProhibitedArea,
  PlateauBuildingFeature,
  PlateauDatasetMeta,
  PlateauGroundFeature,
} from '../api/client';

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

// MapLibreはGeoJSONソース（航路・建物）の処理にWorkerを使うが、既定では自身の
// import.meta.urlからの相対パスを見に行く。Viteの単一バンドル構成ではその隣に
// ワーカーファイルが存在せず、SPAのフォールバックでindex.htmlが返ってしまい、
// Workerがモジュールとして解釈できず無言で失敗する（ラスタータイルはWorker
// 不要なので背景地図だけは表示され、航路・建物の線やポリゴンだけが描画されない、
// という形で症状が出る）。vite.config.tsのmaplibreWorkerAssetsプラグインが
// maplibre-gl-worker.mjsとその相対import先maplibre-gl-shared.mjsを
// /assets/配下に固定パスで配置するので、そのパスを明示的に教える。
maplibregl.setWorkerUrl('/assets/maplibre-gl-worker.mjs');

interface RouteData {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

interface MapContainerProps {
  routeData?: RouteData | null;
  // 左パネルの「航路」レイヤ切り替え。false のときは描画しない。
  showRoute?: boolean;
  // 秩父市周辺の表示範囲（bbox）内の建物（6-5/6-6）。GeoJSON Featureをそのまま描画する。
  buildingFeatures?: PlateauBuildingFeature[];
  showBuildings?: boolean;
  // 地図の表示範囲が変わるたび（初回描画・移動・ズーム）に呼ばれる。呼び出し側は
  // これを使って現在の表示範囲だけbboxで建物を取得し直す（6-6）。showBuildingsが
  // falseの間は呼び出し側で取得自体をスキップし、不要な取得を避ける（6-7）。
  onBoundsChange?: (bounds: MapBounds) => void;
  // 座標入力・航路登録に依存しない静的な参照レイヤ（国土数値情報A16-2020から
  // 再取得済み、秩父市のみ）。ルート設計前から危険区域を確認できるよう、常時
  // 描画対象になる。
  prohibitedAreas?: KnownProhibitedArea[];
  showProhibitedAreas?: boolean;
  // 6-6a: 道路・土砂災害・洪水浸水・土地利用（レイヤーキーごとのGeoJSON Feature）。
  groundFeaturesByLayer?: Record<GroundFeatureLayerKey, PlateauGroundFeature[]>;
  layerVisibility?: Record<GroundFeatureLayerKey, boolean>;
  // 6-10: 凡例・ポップアップに表示する出典・データ時点。
  datasetMeta?: PlateauDatasetMeta | null;
}

// 6-6a/6-13: レイヤーごとの色・パターン・表示名・区分（「航路への影響」/
// 「航路活用の可能性」/土地利用）。design.mdの既存パレットから、まだ未使用の
// トークンを充てる（--brand-cyan=道路、--map-caution=土砂災害、
// --brand-blue-light=洪水浸水、--map-terrain-high=土地利用）。
const GROUND_LAYER_STYLE: Record<
  GroundFeatureLayerKey,
  { color: string; hatch: boolean; label: string; group: 'impact' | 'opportunity' | 'landuse' }
> = {
  road: { color: '#00D2E6', hatch: false, label: '道路', group: 'impact' },
  landslide: { color: '#FF8A00', hatch: true, label: '土砂災害警戒区域', group: 'opportunity' },
  flood: { color: '#3E9BE0', hatch: true, label: '洪水浸水想定区域', group: 'opportunity' },
  landuse: { color: '#8C6239', hatch: false, label: '土地利用', group: 'landuse' },
};

const GROUND_FEATURE_LAYER_KEYS: GroundFeatureLayerKey[] = ['road', 'landslide', 'flood', 'landuse'];

const ROUTE_LAYER_IDS = ['route-line', 'route-start', 'route-end'];
const ROUTE_SOURCE_IDS = ['route', 'route-points'];
const BUILDING_LAYER_IDS = ['building-fill', 'building-outline'];
const BUILDING_SOURCE_IDS = ['buildings'];
const PROHIBITED_LAYER_IDS = ['prohibited-fill', 'prohibited-outline'];
const PROHIBITED_SOURCE_IDS = ['prohibited-areas'];
const PROHIBITED_HATCH_IMAGE_ID = 'prohibited-hatch';

// 航路のレイヤとソースを取り除く。レイヤはソースより先に消す必要がある。
function removeRouteLayers(map: maplibregl.Map) {
  for (const id of ROUTE_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of ROUTE_SOURCE_IDS) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

function removeBuildingLayers(map: maplibregl.Map) {
  for (const id of BUILDING_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of BUILDING_SOURCE_IDS) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

function removeProhibitedLayers(map: maplibregl.Map) {
  for (const id of PROHIBITED_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of PROHIBITED_SOURCE_IDS) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

function groundLayerIds(layer: GroundFeatureLayerKey) {
  return {
    source: `ground-${layer}`,
    fill: `ground-${layer}-fill`,
    outline: `ground-${layer}-outline`,
    hatchImage: `ground-${layer}-hatch`,
  };
}

function removeGroundFeatureLayer(map: maplibregl.Map, layer: GroundFeatureLayerKey) {
  const ids = groundLayerIds(layer);
  if (map.getLayer(ids.fill)) map.removeLayer(ids.fill);
  if (map.getLayer(ids.outline)) map.removeLayer(ids.outline);
  if (map.getSource(ids.source)) map.removeSource(ids.source);
}

// design.md §5-3: 禁止区域は色（--brand-red）だけでなく塗りパターン（交差ハッチ）
// でも区別すること、という制約への対応。8x8pxの交差ハッチをcanvasで生成して登録する。
function ensureHatchPattern(map: maplibregl.Map) {
  if (map.hasImage(PROHIBITED_HATCH_IMAGE_ID)) return;
  const size = 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.strokeStyle = '#E8380D'; // --brand-red
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage(PROHIBITED_HATCH_IMAGE_ID, { width: size, height: size, data: imageData.data });
}

// 土砂災害・洪水浸水（「航路活用の可能性」区分）向けの斜線ハッチ。DID地区の
// 交差ハッチ（禁止区域＝影響）と見た目のパターンを変え、色だけでなく形でも
// 「別カテゴリの区域」だと分かるようにする（design.md §5-3の考え方を踏襲）。
function ensureDiagonalHatchPattern(map: maplibregl.Map, imageId: string, color: string) {
  if (map.hasImage(imageId)) return;
  const size = 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.stroke();
  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage(imageId, { width: size, height: size, data: imageData.data });
}

const EMPTY_GROUND_FEATURES: Record<GroundFeatureLayerKey, PlateauGroundFeature[]> = {
  road: [],
  landslide: [],
  flood: [],
  landuse: [],
};
const ALL_LAYERS_VISIBLE: Record<GroundFeatureLayerKey, boolean> = {
  road: true,
  landslide: true,
  flood: true,
  landuse: true,
};

export default function MapContainer({
  routeData,
  showRoute = true,
  buildingFeatures = [],
  showBuildings = true,
  onBoundsChange,
  prohibitedAreas = [],
  showProhibitedAreas = true,
  groundFeaturesByLayer = EMPTY_GROUND_FEATURES,
  layerVisibility = ALL_LAYERS_VISIBLE,
  datasetMeta = null,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  // スタイル読み込み完了前に addSource/addLayer を呼ぶと MapLibre が
  // "Style is not done loading." を投げ、未捕捉例外で画面全体が白くなる。
  // 準備完了を state で持ち、描画side effectの依存に入れて待ち合わせる。
  const [styleReady, setStyleReady] = useState(false);
  // 地図初期化effect（依存配列[]、マウント時に1回だけ実行）からは常に最新の
  // onBoundsChangeを呼びたいが、依存に入れると親の再レンダリングのたびに地図を
  // 作り直すことになってしまう。refで最新値だけ追従させ、古いクロージャを避ける。
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [139.0313939, 35.9683357],
      zoom: 15,
      // MapLibre が既定で付与する英語のaria-label等を日本語にする。
      locale: {
        'Map.Title': '地図',
        'AttributionControl.ToggleAttribution': '出典表示の切り替え',
        'NavigationControl.ZoomIn': '拡大',
        'NavigationControl.ZoomOut': '縮小',
      },
    });

    // 'style.load' はスタイルの解析完了時、'load' はタイル取得を含む初回描画完了時に
    // 発火する。addSource/addLayer に必要なのは前者だけなので、'load' だけを待つと
    // タイル配信が遅い・到達できない環境で航路が永久に描かれない。両方を購読し、
    // 先に来たほうで準備完了とする（setState は同値なので二重発火は無害）。
    const markStyleReady = () => setStyleReady(true);
    map.current.on('style.load', markStyleReady);
    map.current.on('load', markStyleReady);

    // 初回表示・移動・ズームのたびに現在の表示範囲を通知する（6-6）。
    // 'moveend' はドラッグ・ズーム操作の完了時にまとめて1回発火するため、
    // ドラッグ中に毎フレーム取得しにいくことはない。
    const notifyBounds = () => {
      if (!map.current || !onBoundsChangeRef.current) return;
      const bounds = map.current.getBounds();
      onBoundsChangeRef.current({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLon: bounds.getWest(),
        maxLon: bounds.getEast(),
      });
    };
    map.current.on('moveend', notifyBounds);
    // 'load'（背景タイル取得完了）ではなく、上と同じ'style.load'を使う。背景タイル
    // （OpenStreetMap）が遅い・到達できない環境でも建物データ取得は妨げない
    // （実機確認: 2026-08-17、'load'待ちだと/buildingsが永久に呼ばれなかった）。
    map.current.on('style.load', notifyBounds);

    return () => {
      setStyleReady(false);
      if (map.current) map.current.remove();
    };
  }, []);

  // 航路ラインを描画
  useEffect(() => {
    if (!map.current || !styleReady) return;

    const mapInstance = map.current;

    // 何を描くかに関わらず、まず前回の描画を消す。こうしないと登録失敗後
    // （routeData=null）やレイヤ非表示時に古い航路が残り、現在の入力に対する
    // 結果だと誤認される。
    removeRouteLayers(mapInstance);
    if (!routeData || !showRoute) return;

    // ルートラインのGeoJSON
    const routeGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [routeData.startLon, routeData.startLat],
              [routeData.endLon, routeData.endLat],
            ],
          },
        },
      ],
    };

    // ソースを追加
    mapInstance.addSource('route', {
      type: 'geojson',
      data: routeGeoJSON,
    });

    // ラインレイヤーを追加
    mapInstance.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': '#0B3D75', // map.route color
        'line-width': 3,
        'line-opacity': 0.8,
      },
    });

    // 始点・終点のマーカー
    const pointsGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { type: 'start' },
          geometry: {
            type: 'Point',
            coordinates: [routeData.startLon, routeData.startLat],
          },
        },
        {
          type: 'Feature',
          properties: { type: 'end' },
          geometry: {
            type: 'Point',
            coordinates: [routeData.endLon, routeData.endLat],
          },
        },
      ],
    };

    mapInstance.addSource('route-points', {
      type: 'geojson',
      data: pointsGeoJSON,
    });

    // 始点
    mapInstance.addLayer({
      id: 'route-start',
      type: 'circle',
      source: 'route-points',
      filter: ['==', ['get', 'type'], 'start'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#3FD35F', // status.ok
        'circle-opacity': 0.9,
      },
    });

    // 終点
    mapInstance.addLayer({
      id: 'route-end',
      type: 'circle',
      source: 'route-points',
      filter: ['==', ['get', 'type'], 'end'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#FF8A00', // map.caution
        'circle-opacity': 0.9,
      },
    });
  }, [routeData, showRoute, styleReady]);

  // 建物フットプリントを描画（6-6: 表示範囲bboxで取得したGeoJSONをそのまま使う。
  // 座標は既にGeoJSON標準の[lon, lat]順のため変換不要）。
  useEffect(() => {
    if (!map.current || !styleReady) return;

    const mapInstance = map.current;
    removeBuildingLayers(mapInstance);
    if (!showBuildings || buildingFeatures.length === 0) return;

    mapInstance.addSource('buildings', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: buildingFeatures },
    });

    mapInstance.addLayer({
      id: 'building-fill',
      type: 'fill',
      source: 'buildings',
      paint: {
        // design.md §5-3 --map-building（中間グレー、ベタ塗り）
        'fill-color': '#8A96A0',
        'fill-opacity': 0.6,
      },
    });

    mapInstance.addLayer({
      id: 'building-outline',
      type: 'line',
      source: 'buildings',
      paint: {
        'line-color': '#8A96A0',
        'line-width': 1,
      },
    });
  }, [buildingFeatures, showBuildings, styleReady]);

  // DID地区（人口集中地区）等の飛行禁止区域を描画（rings を持つもののみ。
  // 現状は国土数値情報から再取得済みの秩父市DID地区のみ）。座標入力・航路登録の
  // 前から常時表示し、ルート設計時に危険区域を避けられるようにする。
  useEffect(() => {
    if (!map.current || !styleReady) return;

    const mapInstance = map.current;
    removeProhibitedLayers(mapInstance);
    if (!showProhibitedAreas) return;

    const polygons = prohibitedAreas
      .filter((a) => a.rings && a.rings.length > 0)
      .flatMap((a) =>
        a.rings!.map((ring, i) => ({
          type: 'Feature' as const,
          properties: { id: `${a.id}-${i}`, name: a.name ?? '' },
          geometry: {
            type: 'Polygon' as const,
            // rings は [lat, lon] のリング。GeoJSONは[lon, lat]の順。
            coordinates: [ring.map(([lat, lon]) => [lon, lat])],
          },
        }))
      );
    if (polygons.length === 0) return;

    ensureHatchPattern(mapInstance);

    mapInstance.addSource('prohibited-areas', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: polygons },
    });

    mapInstance.addLayer({
      id: 'prohibited-fill',
      type: 'fill',
      source: 'prohibited-areas',
      paint: {
        // design.md §5-3 --map-prohibited（--brand-red）＋交差ハッチ（色だけで
        // 区別しない制約への対応）
        'fill-pattern': PROHIBITED_HATCH_IMAGE_ID,
        'fill-opacity': 0.7,
      },
    });

    mapInstance.addLayer({
      id: 'prohibited-outline',
      type: 'line',
      source: 'prohibited-areas',
      paint: {
        'line-color': '#E8380D',
        'line-width': 2,
      },
    });
  }, [prohibitedAreas, showProhibitedAreas, styleReady]);

  // クリックポップアップは常に最新のdatasetMetaを参照したいが、effectの依存に
  // 入れるとレイヤー再描画・クリックハンドラ再登録が余計に走るためrefで追従させる
  // （onBoundsChangeRefと同じ考え方）。
  const datasetMetaRef = useRef(datasetMeta);
  datasetMetaRef.current = datasetMeta;

  // 6-6a: 道路・土砂災害・洪水浸水・土地利用を描画する。4レイヤーとも構造が同じ
  // （Polygon/MultiPolygonのfill+outline、任意でハッチパターン）ため1つのeffectで
  // まとめて扱う。クリックで分類名・出典・データ時点のポップアップを出す（6-6a）。
  useEffect(() => {
    if (!map.current || !styleReady) return;
    const mapInstance = map.current;

    const clickHandlers: Array<{ layerId: string; handler: (e: maplibregl.MapLayerMouseEvent) => void }> = [];

    for (const layer of GROUND_FEATURE_LAYER_KEYS) {
      removeGroundFeatureLayer(mapInstance, layer);
    }

    for (const layer of GROUND_FEATURE_LAYER_KEYS) {
      if (!layerVisibility[layer]) continue;
      const features = groundFeaturesByLayer[layer];
      if (!features || features.length === 0) continue;

      const style = GROUND_LAYER_STYLE[layer];
      const ids = groundLayerIds(layer);

      mapInstance.addSource(ids.source, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      const fillPaint: maplibregl.FillLayerSpecification['paint'] = style.hatch
        ? (() => {
            ensureDiagonalHatchPattern(mapInstance, ids.hatchImage, style.color);
            return { 'fill-pattern': ids.hatchImage, 'fill-opacity': 0.6 };
          })()
        : { 'fill-color': style.color, 'fill-opacity': 0.35 };

      mapInstance.addLayer({ id: ids.fill, type: 'fill', source: ids.source, paint: fillPaint });
      mapInstance.addLayer({
        id: ids.outline,
        type: 'line',
        source: ids.source,
        paint: { 'line-color': style.color, 'line-width': 1 },
      });

      const handler = (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as PlateauGroundFeature['properties'];
        const meta = datasetMetaRef.current;
        const lines = [
          `<div style="font-weight:600;margin-bottom:2px;">${style.label}</div>`,
          `<div>分類: ${props.class_label ?? '不明'}</div>`,
        ];
        if (props.status_label) lines.push(`<div>指定状況: ${props.status_label}</div>`);
        if (props.scale_label) lines.push(`<div>規模区分: ${props.scale_label}</div>`);
        if (meta) lines.push(`<div style="margin-top:4px;color:#6b7280;">出典: ${meta.source}（${meta.dataDate}時点）</div>`);
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(lines.join(''))
          .addTo(mapInstance);
      };
      mapInstance.on('click', ids.fill, handler);
      clickHandlers.push({ layerId: ids.fill, handler });
    }

    return () => {
      for (const { layerId, handler } of clickHandlers) {
        mapInstance.off('click', layerId, handler);
      }
    };
  }, [groundFeaturesByLayer, layerVisibility, styleReady]);

  return (
    // overflow-hidden: 凡例（absolute）や地図canvasが、判定詳細アコーディオンを
    // 開いてこのflexボックスが縮んだ際にも自身の領域内に留まるようにする。
    // これが無いと、縮む前の高さのまま凡例が描画され続け、下のResultsPanel（別要素、
    // z軸では並列）に重なって操作できなくなる不具合があった（2026-08-17報告）。
    <div className="flex-1 relative bg-bg-app overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      {/* 6-6a/6-13: 凡例。「航路への影響」/「航路活用の可能性」の見出しを分け、
          災害リスク区域を障害物・飛行禁止区域と同じ意味で誤認させない
          （改善タスク§2）。ハッチはCSSのrepeating-linear-gradientでcanvas版と
          近い見た目を作る（実データの塗りとは別レンダリング経路だが凡例用途では
          十分）。z-10はMapLibreの内部canvas/コントロール類より確実に前面へ出す
          ためで、ResultsPanel（z-20、App.tsx側）より下に固定する。 */}
      <div className="absolute top-4 right-4 z-10 bg-bg-panel rounded shadow-lg p-3 text-xs text-text-secondary max-w-56 space-y-2">
        <div>
          <p className="font-semibold text-text-primary">地図：MapLibre GL</p>
          <p>ズーム15・秩父市周辺</p>
        </div>

        <div>
          <div className="font-semibold text-text-primary mb-1">航路への影響</div>
          <LegendRow color="#0B3D75" label="航路" />
          <LegendRow color="#8A96A0" label="建物" />
          <LegendRow color="#00D2E6" label="道路" />
          <LegendRow color="#E8380D" label="DID地区" hatch="cross" />
        </div>

        <div>
          <div className="font-semibold text-text-primary mb-1">航路活用の可能性</div>
          <LegendRow color="#FF8A00" label="土砂災害警戒区域" hatch="diagonal" />
          <LegendRow color="#3E9BE0" label="洪水浸水想定区域" hatch="diagonal" />
        </div>

        <div>
          <div className="font-semibold text-text-primary mb-1">その他</div>
          <LegendRow color="#8C6239" label="土地利用（影響/活用は分類による）" />
        </div>

        {datasetMeta && (
          <div className="pt-1 border-t border-gray-200 text-[10px] text-text-secondary">
            出典: {datasetMeta.source}（{datasetMeta.dataDate}時点）
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  hatch,
}: {
  color: string;
  label: string;
  hatch?: 'diagonal' | 'cross';
}) {
  const swatchStyle: CSSProperties = hatch
    ? {
        backgroundColor: `${color}33`,
        backgroundImage:
          hatch === 'cross'
            ? `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 4px), repeating-linear-gradient(-45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 4px)`
            : `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 4px)`,
      }
    : { backgroundColor: color };
  return (
    <div className="flex items-center gap-1.5 leading-4">
      <span className="inline-block w-3 h-3 rounded-sm border border-black/10 flex-shrink-0" style={swatchStyle} />
      <span>{label}</span>
    </div>
  );
}
