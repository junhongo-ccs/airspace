import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface RouteData {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

interface MapContainerProps {
  routeData?: RouteData | null;
}

export default function MapContainer({ routeData }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

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
    });

    return () => {
      if (map.current) map.current.remove();
    };
  }, []);

  // 航路ラインを描画
  useEffect(() => {
    if (!map.current || !routeData) return;

    const mapInstance = map.current;

    // 既存のルートレイヤーを削除
    if (mapInstance.getSource('route')) {
      if (mapInstance.getLayer('route-line')) {
        mapInstance.removeLayer('route-line');
      }
      mapInstance.removeSource('route');
    }

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
    if (mapInstance.getSource('route-points')) {
      if (mapInstance.getLayer('route-start')) {
        mapInstance.removeLayer('route-start');
      }
      if (mapInstance.getLayer('route-end')) {
        mapInstance.removeLayer('route-end');
      }
      mapInstance.removeSource('route-points');
    }

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
  }, [routeData]);

  return (
    <div className="flex-1 relative bg-bg-app">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Map overlay info */}
      <div className="absolute top-4 right-4 bg-bg-panel rounded shadow-lg p-3 text-xs text-text-secondary max-w-48">
        <p>MapLibre GL Map</p>
        <p>Zoom-level 15, center near Chichibu</p>
      </div>
    </div>
  );
}
