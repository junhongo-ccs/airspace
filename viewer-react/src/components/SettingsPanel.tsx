import { useEffect, useState } from 'react';
import type { ConnectionStatus } from '../api/client';

interface SettingsPanelProps {
  connection: ConnectionStatus | null;
  startLat: number;
  setStartLat: (val: number) => void;
  startLon: number;
  setStartLon: (val: number) => void;
  endLat: number;
  setEndLat: (val: number) => void;
  endLon: number;
  setEndLon: (val: number) => void;
  aglM: number;
  setAglM: (val: number) => void;
  onQuery: () => void;
  isLoading: boolean;
}

// 接続状態の見え方。mock は「BFF までは届いているが Laravel は見ていない」状態で、
// 実データと取り違えないよう Connected とは別扱いにする。
function describeConnection(connection: ConnectionStatus | null): {
  label: string;
  dotClass: string;
  detail?: string;
} {
  if (connection === null) {
    return { label: 'Checking...', dotClass: 'bg-status-idle' };
  }
  if (connection.mock) {
    return {
      label: 'Mock mode',
      dotClass: 'bg-status-warn',
      detail: 'BFF がモックで応答しています（Laravel 未接続）',
    };
  }
  if (connection.connected) {
    return { label: 'Connected', dotClass: 'bg-status-ok', detail: connection.baseUrl };
  }
  return {
    label: connection.state === 'error' ? 'Error' : 'Disconnected',
    dotClass: 'bg-status-error',
    detail: connection.message ?? connection.baseUrl,
  };
}

export default function SettingsPanel({
  connection,
  startLat,
  setStartLat,
  startLon,
  setStartLon,
  endLat,
  setEndLat,
  endLon,
  setEndLon,
  aglM,
  setAglM,
  onQuery,
  isLoading,
}: SettingsPanelProps) {
  const [spatialId, setSpatialId] = useState<string | null>(null);
  const connectionView = describeConnection(connection);

  useEffect(() => {
    if (startLat && startLon) {
      const z = 17;
      const n = Math.pow(2, z);
      const lon_rad = (startLon * Math.PI) / 180;
      const lat_rad = (startLat * Math.PI) / 180;
      const x = Math.floor(((lon_rad + Math.PI) / (2 * Math.PI)) * n);
      const y = Math.floor(
        ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2) * n
      );
      setSpatialId(`${z}/${x}/${y}`);
    }
  }, [startLat, startLon]);

  return (
    <div className="w-80 bg-bg-panel border-r border-brand-blue-light/20 flex flex-col overflow-y-auto">
      {/* Connection status */}
      <div className="px-6 py-4 border-b border-bg-table-head">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionView.dotClass}`}></div>
          <span className="text-sm font-medium text-text-primary">
            {connectionView.label}
          </span>
        </div>
        {connectionView.detail && (
          <p className="mt-1 text-xs text-text-secondary break-all">
            {connectionView.detail}
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Spatial ID display */}
        {spatialId && (
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Spatial ID
            </label>
            <div className="mono bg-bg-app p-2 rounded border border-bg-table-head text-xs text-text-primary">
              {spatialId}
            </div>
          </div>
        )}

        {/* Start coordinates */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Start Point
          </label>
          <div className="space-y-2">
            <input
              type="number"
              step="0.0001"
              value={startLat}
              onChange={(e) => setStartLat(parseFloat(e.target.value))}
              placeholder="Latitude"
              className="w-full px-3 py-2 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
            <input
              type="number"
              step="0.0001"
              value={startLon}
              onChange={(e) => setStartLon(parseFloat(e.target.value))}
              placeholder="Longitude"
              className="w-full px-3 py-2 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>
        </div>

        {/* End coordinates */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
            End Point
          </label>
          <div className="space-y-2">
            <input
              type="number"
              step="0.0001"
              value={endLat}
              onChange={(e) => setEndLat(parseFloat(e.target.value))}
              placeholder="Latitude"
              className="w-full px-3 py-2 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
            <input
              type="number"
              step="0.0001"
              value={endLon}
              onChange={(e) => setEndLon(parseFloat(e.target.value))}
              placeholder="Longitude"
              className="w-full px-3 py-2 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>
        </div>

        {/* AGL altitude */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
            AGL Altitude (m)
          </label>
          <input
            type="number"
            step="1"
            value={aglM}
            onChange={(e) => setAglM(parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
          />
          <div className="mt-2 p-2 bg-bg-app rounded text-xs text-text-secondary">
            {aglM < 150 ? (
              <span className="text-status-ok">✓ Within 150m legal limit</span>
            ) : (
              <span className="text-status-warn">⚠ Exceeds 150m legal limit</span>
            )}
          </div>
        </div>

        {/* Layer visibility */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Layers
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm text-text-primary">Buildings</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm text-text-primary">DID Zones</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm text-text-primary">Route</span>
            </label>
          </div>
        </div>

        {/* Query button */}
        <button
          onClick={onQuery}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-action-primary text-white font-semibold rounded transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Query & Register'}
        </button>
      </div>
    </div>
  );
}
