import { useState } from 'react';
import type { QueryResult } from '../App';

interface ResultsPanelProps {
  queryResult: QueryResult;
}

// 地物をレイヤ別に集計する（BFF が返す layer は building / road / landslide /
// flood / landuse。api_client.py の OBJECT_CD_LAYERS と対応）。
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
            Query Results
          </h2>
          <span className="text-text-secondary">
            {queryExpanded ? '−' : '+'}
          </span>
        </button>
        {queryExpanded && (
          <div className="px-6 py-4 bg-bg-app text-sm text-text-secondary">
            {queryResult.status === 'idle' && (
              <p className="text-text-secondary">Click "Query & Register" to start</p>
            )}
            {queryResult.status === 'loading' && (
              <p className="text-status-idle">Loading...</p>
            )}
            {queryResult.status === 'success' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Route ID:</span>
                  <span className="mono text-text-primary font-medium">{queryResult.routeId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ground Features:</span>
                  <span className="text-text-primary font-medium">{queryResult.features?.length || 0} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-text-secondary text-xs">{queryResult.timestamp ? new Date(queryResult.timestamp).toLocaleString() : '-'}</span>
                </div>
              </div>
            )}
            {queryResult.status === 'partial' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Route ID:</span>
                  <span className="mono text-text-primary font-medium">{queryResult.routeId}</span>
                </div>
                <div className="text-status-warn">
                  <p className="font-medium">Partial — 地物照会に失敗</p>
                  <p className="text-xs">{queryResult.message}</p>
                </div>
              </div>
            )}
            {queryResult.status === 'error' && (
              <div className="text-status-error">
                <p className="font-medium">Error</p>
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
            Detailed Analysis
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
                    <th className="pb-2 font-semibold text-text-primary text-xs uppercase">Layer</th>
                    <th className="pb-2 font-semibold text-text-primary text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 照会で実際に返ってきた地物のみを件数で表示する。
                      交差判定そのものは React 版では未実装（Streamlit 版のみ）。 */}
                  <tr className="border-b border-bg-table-head">
                    <td className="py-2">Ground features (BFF 照会)</td>
                    <td className="py-2">
                      {queryResult.status === 'success' ? (
                        Object.keys(layerCounts).length > 0 ? (
                          <span className="text-text-primary">
                            {Object.entries(layerCounts)
                              .map(([layer, n]) => `${layer}: ${n}`)
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
                    <td className="py-2">DID 交差判定</td>
                    <td className="py-2"><span className="text-text-secondary">未実装（React版）</span></td>
                  </tr>
                  <tr>
                    <td className="py-2">150m AGL ルール</td>
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
