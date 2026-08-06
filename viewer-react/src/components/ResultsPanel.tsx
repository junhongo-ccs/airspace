import { useState } from 'react';
import type { QueryResult } from '../App';

interface ResultsPanelProps {
  queryResult: QueryResult;
}

// BFF が返す layer 値の表示名。viewer/src/api_client.py の OBJECT_CD_LAYERS と対応。
const LAYER_LABELS: Record<string, string> = {
  building: '建物',
  road: '道路',
  landslide: '土砂災害',
  flood: '洪水浸水',
  landuse: '土地利用',
};

// 地物をレイヤ別に集計する。
function countByLayer(features: QueryResult['features']): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of features ?? []) {
    const key = f.layer ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export default function ResultsPanel({ queryResult }: ResultsPanelProps) {
  const [queryExpanded, setQueryExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const layerCounts = countByLayer(queryResult.features);

  return (
    <div className="border-t border-brand-blue-light/20 bg-bg-panel flex flex-col">
      {/* Query Results Section */}
      <div className="border-b border-bg-table-head">
        <button
          onClick={() => setQueryExpanded(!queryExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-app transition-colors"
        >
          <h2 className="text-sm font-semibold text-text-primary">
            照会結果
          </h2>
          <span className="text-text-secondary">
            {queryExpanded ? '−' : '+'}
          </span>
        </button>
        {queryExpanded && (
          <div className="px-6 py-4 bg-bg-app text-sm text-text-secondary">
            {queryResult.status === 'idle' && (
              <p className="text-text-secondary">
                「航路を登録して周辺データを照会」を押すと開始します
              </p>
            )}
            {queryResult.status === 'loading' && (
              <p className="text-status-idle">実行中…</p>
            )}
            {queryResult.status === 'success' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>航路ID:</span>
                  <span className="mono text-text-primary font-medium">{queryResult.routeId}</span>
                </div>
                <div className="flex justify-between">
                  <span>周辺地物:</span>
                  <span className="text-text-primary font-medium">{queryResult.features?.length || 0} 件</span>
                </div>
                <div className="flex justify-between">
                  <span>取得時刻:</span>
                  <span className="text-text-secondary text-xs">{queryResult.timestamp ? new Date(queryResult.timestamp).toLocaleString('ja-JP') : '-'}</span>
                </div>
              </div>
            )}
            {queryResult.status === 'partial' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>航路ID:</span>
                  <span className="mono text-text-primary font-medium">{queryResult.routeId}</span>
                </div>
                <div className="text-status-warn">
                  <p className="font-medium">一部成功 — 周辺地物の照会に失敗</p>
                  <p className="text-xs">{queryResult.message}</p>
                </div>
              </div>
            )}
            {queryResult.status === 'error' && (
              <div className="text-status-error">
                <p className="font-medium">エラー</p>
                <p className="text-xs">{queryResult.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Section */}
      <div>
        <button
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-app transition-colors"
        >
          <h2 className="text-sm font-semibold text-text-primary">
            判定詳細
          </h2>
          <span className="text-text-secondary">
            {detailsExpanded ? '−' : '+'}
          </span>
        </button>
        {detailsExpanded && (
          <div className="px-6 py-4 bg-bg-app text-sm text-text-secondary border-t border-bg-table-head">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-bg-table-head">
                    <th className="pb-2 font-semibold text-text-primary text-xs">項目</th>
                    <th className="pb-2 font-semibold text-text-primary text-xs">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 照会で実際に返ってきた地物のみを件数で表示する。
                      交差判定そのものは React 版では未実装（Streamlit 版のみ）。 */}
                  <tr className="border-b border-bg-table-head">
                    <td className="py-2">周辺地物（照会結果）</td>
                    <td className="py-2">
                      {queryResult.status === 'success' ? (
                        Object.keys(layerCounts).length > 0 ? (
                          <span className="text-text-primary">
                            {Object.entries(layerCounts)
                              .map(([layer, n]) => `${LAYER_LABELS[layer] ?? layer} ${n} 件`)
                              .join(' / ')}
                          </span>
                        ) : (
                          <span className="text-text-secondary">0 件</span>
                        )
                      ) : (
                        <span className="text-text-secondary">未照会</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-bg-table-head">
                    <td className="py-2">DID地区との交差判定</td>
                    <td className="py-2"><span className="text-text-secondary">未実装（React版）</span></td>
                  </tr>
                  <tr>
                    <td className="py-2">150m AGL（絶対高度）判定</td>
                    <td className="py-2"><span className="text-text-secondary">未実装（React版）</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
