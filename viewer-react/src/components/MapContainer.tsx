import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GroundFeature, KnownProhibitedArea } from '../api/client';

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
  // 照会結果の地物。footprint を持つ建物（Phase B投入分）のみ描画対象になる。
  buildingFeatures?: GroundFeature[];
  showBuildings?: boolean;
  // 座標入力・航路登録に依存しない静的な参照レイヤ（国土数値情報A16-2020から
  // 再取得済み、秩父市のみ）。ルート設計前から危険区域を確認できるよう、常時
  // 描画対象になる。
  prohibitedAreas?: KnownProhibitedArea[];
  showProhibitedAreas?: boolean;
}

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

export default function MapContainer({
  routeData,
  showRoute = true,
  buildingFeatures = [],
  showBuildings = true,
  prohibitedAreas = [],
  showProhibitedAreas = true,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  // スタイル読み込み完了前に addSource/addLayer を呼ぶと MapLibre が
  // "Style is not done loading." を投げ、未捕捉例外で画面全体が白くなる。
  // 準備完了を state で持ち、描画side effectの依存に入れて待ち合わせる。
  const [styleReady, setStyleReady] = useState(false);

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

  // 建物フットプリントを描画（Phase B投入分の29件のみfootprintを持つ）
  useEffect(() => {
    if (!map.current || !styleReady) return;

    const mapInstance = map.current;
    removeBuildingLayers(mapInstance);
    if (!showBuildings) return;

    const polygons = buildingFeatures
      .filter((f) => f.layer === 'building' && f.footprint)
      .map((f) => ({
        type: 'Feature' as const,
        properties: { id: f.id, intersect: f.intersect ?? '' },
        geometry: {
          type: 'Polygon' as const,
          // footprint は [lat, lon] のリング。GeoJSONは[lon, lat]の順。
          coordinates: [f.footprint!.map(([lat, lon]) => [lon, lat])],
        },
      }));
    if (polygons.length === 0) return;

    mapInstance.addSource('buildings', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: polygons },
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

  return (
    <div className="flex-1 relative bg-bg-app">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Map overlay info */}
      <div className="absolute top-4 right-4 bg-bg-panel rounded shadow-lg p-3 text-xs text-text-secondary max-w-48">
        <p>地図：MapLibre GL</p>
        <p>ズーム15・秩父市周辺</p>
      </div>
    </div>
  );
}
