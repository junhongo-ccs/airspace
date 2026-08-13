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
  showRoute: boolean;
  setShowRoute: (val: boolean) => void;
  showBuildings: boolean;
  setShowBuildings: (val: boolean) => void;
  showProhibitedAreas: boolean;
  setShowProhibitedAreas: (val: boolean) => void;
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
    return { label: '接続確認中…', dotClass: 'bg-status-idle' };
  }
  if (connection.mock) {
    return {
      label: 'モックモード',
      dotClass: 'bg-status-warn',
      detail: 'BFFがモックで応答しています（実APIには未接続）',
    };
  }
  if (connection.connected) {
    return { label: '接続済み', dotClass: 'bg-status-ok', detail: connection.baseUrl };
  }
  // 失敗時は理由と接続先の両方を出す。どちらか一方だと「URLが違うのか、
  // 認証で弾かれているのか」が画面から判断できない。
  return {
    label: connection.state === 'error' ? 'エラー' : '未接続',
    dotClass: 'bg-status-error',
    detail: [connection.message, connection.baseUrl].filter(Boolean).join(' / ') || undefined,
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
  showRoute,
  setShowRoute,
  showBuildings,
  setShowBuildings,
  showProhibitedAreas,
  setShowProhibitedAreas,
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
      <div className="px-5 py-2.5 border-b border-bg-table-head">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionView.dotClass}`}></div>
          <span className="text-sm font-medium text-text-primary">
            {connectionView.label}
          </span>
        </div>
        {connectionView.detail && (
          <p className="mt-0.5 text-xs text-text-secondary break-all leading-4">
            {connectionView.detail}
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="flex-1 px-5 py-3 space-y-3">
        {/* Spatial ID display */}
        {spatialId && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary tracking-wide mb-1">
              <span className="h-3 w-0.5 rounded-full bg-action-primary" aria-hidden="true" />
              空間ID
            </div>
            <div className="mono bg-bg-app px-2 py-1.5 rounded border border-bg-table-head text-xs text-text-primary">
              {spatialId}
            </div>
          </div>
        )}

        {/* Start coordinates */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
            <span className="h-3 w-0.5 rounded-full bg-action-primary" aria-hidden="true" />
            始点
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-text-secondary">
              緯度
              <input
                type="number"
                step="0.0001"
                value={startLat}
                onChange={(e) => setStartLat(parseFloat(e.target.value))}
                aria-label="始点 緯度"
                className="mt-0.5 w-full px-2 py-1.5 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </label>
            <label className="block text-xs text-text-secondary">
              経度
              <input
                type="number"
                step="0.0001"
                value={startLon}
                onChange={(e) => setStartLon(parseFloat(e.target.value))}
                aria-label="始点 経度"
                className="mt-0.5 w-full px-2 py-1.5 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </label>
          </div>
        </div>

        {/* End coordinates */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
            <span className="h-3 w-0.5 rounded-full bg-action-primary" aria-hidden="true" />
            終点
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-text-secondary">
              緯度
              <input
                type="number"
                step="0.0001"
                value={endLat}
                onChange={(e) => setEndLat(parseFloat(e.target.value))}
                aria-label="終点 緯度"
                className="mt-0.5 w-full px-2 py-1.5 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </label>
            <label className="block text-xs text-text-secondary">
              経度
              <input
                type="number"
                step="0.0001"
                value={endLon}
                onChange={(e) => setEndLon(parseFloat(e.target.value))}
                aria-label="終点 経度"
                className="mt-0.5 w-full px-2 py-1.5 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </label>
          </div>
        </div>

        {/* AGL altitude */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary tracking-wide mb-1">
            <span className="h-3 w-0.5 rounded-full bg-action-primary" aria-hidden="true" />
            飛行高度（AGL・地上高、m）
          </div>
          <input
            type="number"
            step="1"
            value={aglM}
            onChange={(e) => setAglM(parseFloat(e.target.value))}
            aria-label="飛行高度（AGL・地上高、m）"
            className="w-full px-3 py-1.5 text-sm border border-brand-blue-light/30 rounded bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
          />
          {/* 入力値と150mの単純比較のみ。飛行可否を示すものではないため
              「適合」等の断定表現は使わず、未確認の範囲を必ず併記する（仕様書§2-2）。 */}
          <div className="mt-1.5 px-2 py-1.5 bg-bg-app rounded text-xs text-text-secondary leading-4">
            {aglM < 150 ? (
              <span className="text-status-ok">150m未満（ほかの要件は未確認）</span>
            ) : (
              <span className="text-status-warn">
                150m以上（許可・承認が必要な可能性。ほかの要件も未確認）
              </span>
            )}
          </div>
        </div>

        {/* Layer visibility */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
            <span className="h-3 w-0.5 rounded-full bg-action-primary" aria-hidden="true" />
            レイヤ
          </div>
          <div className="space-y-1.5">
            {/* 建物外形はPhase B投入分（3次メッシュ53397062）のみ。レイヤーONなら
                航路照会前でも地図上で表示・非表示を切り替えられる。 */}
            <label className="flex items-center gap-2 cursor-pointer leading-4">
              <input
                type="checkbox"
                checked={showBuildings}
                onChange={(e) => setShowBuildings(e.target.checked)}
                className="w-4 h-4 accent-action-primary"
              />
              <span className="text-sm text-text-primary">建物</span>
              <span className="text-xs text-text-secondary">（限定エリアのみ）</span>
            </label>
            {/* 実APIレスポンス自体にはポリゴンが含まれないが、DID地区は安定ID
                （flightProhibitedAreaId）を持つため国土数値情報から再取得した
                ジオメトリで秩父市のみ地図描画できる（2026年8月7日）。ルート設計時に
                危険区域を避けられるよう、座標入力・航路登録の前から常時地図に表示
                する（航路との交差確認は登録後の判定詳細を参照。既定の航路座標とは
                DID地区が約3km離れているため、既定のままでは判定詳細は0件になる。
                仕様書§7-2-補参照）。 */}
            <label className="flex items-center gap-2 cursor-pointer leading-4">
              <input
                type="checkbox"
                checked={showProhibitedAreas}
                onChange={(e) => setShowProhibitedAreas(e.target.checked)}
                className="w-4 h-4 accent-action-primary"
              />
              <span className="text-sm text-text-primary">DID地区</span>
              <span className="text-xs text-text-secondary">（秩父市のみ地図描画対応）</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer leading-4">
              <input
                type="checkbox"
                checked={showRoute}
                onChange={(e) => setShowRoute(e.target.checked)}
                className="w-4 h-4 accent-action-primary"
              />
              <span className="text-sm text-text-primary">航路</span>
            </label>
          </div>
        </div>

        {/* Query button */}
        <button
          onClick={onQuery}
          disabled={isLoading}
          className="w-full px-4 py-2.5 bg-action-primary text-white text-sm font-semibold rounded transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '実行中…' : '航路を登録して周辺データを照会'}
        </button>
      </div>
    </div>
  );
}
