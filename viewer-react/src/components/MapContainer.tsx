import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapContainer() {
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
