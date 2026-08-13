import { useState } from 'react';
import type { QueryResult } from '../App';

interface ResultsPanelProps {
  queryResult: QueryResult;
  // 秩父市のDID地区のみ地図描画に対応（MapContainer参照）。それ以外の飛行禁止
  // 区域はジオメトリが無く地図描画できないため、チェックボックスは判定詳細表の
  // 表示/非表示も兼ねる。
  showProhibitedAreas: boolean;
}

// BFF が返す layer 値の表示名。viewer/src/api_client.py の OBJECT_CD_LAYERS と対応。
const LAYER_LABELS: Record<string, string> = {
  building: '建物',
  road: '道路',
  landslide: '土砂災害',
  flood: '洪水浸水',
  landuse: '土地利用',
};

// 現在のボクセル照会で画面に出せるのは、外形と高さを保持する建物だけ。
// 道路・土砂災害・洪水浸水・土地利用は、元データの分類・外形を再取得してから
// 表示する（改善タスク参照）。件数だけの表示は航路判断を誤らせるため除外する。
function isDisplayableFeature(feature: NonNullable<QueryResult['features']>[number]): boolean {
  return feature.layer === 'building';
}

// 表示可能な地物をレイヤ別に集計する。
function countByLayer(features: QueryResult['features']): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of (features ?? []).filter(isDisplayableFeature)) {
    const key = f.layer ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export default function ResultsPanel({ queryResult, showProhibitedAreas }: ResultsPanelProps) {
  const [queryExpanded, setQueryExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const layerCounts = countByLayer(queryResult.features);
  const displayableFeatures = (queryResult.features ?? []).filter(isDisplayableFeature);
  // partial は「地物照会が失敗」と「地物は成功したが飛行禁止区域の照会だけ失敗」の
  // 両方を意味する。航路登録が成功していれば、少なくとも航路IDと取得試行結果は表示する。
  const routeQueried = queryResult.status === 'success' || queryResult.status === 'partial';
  const detailRows = [
    ...displayableFeatures.map((f) => ({
      key: `feature-${f.id}`,
      layer: LAYER_LABELS[f.layer] ?? f.layer,
      id: f.id,
      intersect: f.intersect ?? '未検証',
    })),
    ...(showProhibitedAreas ? queryResult.prohibitedAreas ?? [] : []).map((a) => ({
      key: `prohibited-${a.id}`,
      layer: '飛行禁止区域（DID等）',
      id: a.name ?? a.id,
      intersect: a.intersect ?? '未検証',
    })),
  ];

  return (
    <div className="border-t border-brand-blue-light/20 bg-bg-panel flex flex-col">
      {/* Query Results Section */}
      <div className="border-b border-bg-table-head">
        <button
          onClick={() => setQueryExpanded(!queryExpanded)}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-bg-app transition-colors"
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
            {routeQueried && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>航路ID:</span>
                  <span className="mono text-text-primary font-medium">{queryResult.routeId}</span>
                </div>
                <div className="flex justify-between">
                  <span>表示可能な周辺地物:</span>
                  {queryResult.features !== undefined ? (
                    <span className="text-text-primary font-medium">{displayableFeatures.length} 件</span>
                  ) : (
                    <span className="text-status-error font-medium">取得失敗</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>取得時刻:</span>
                  <span className="text-text-secondary text-xs">{queryResult.timestamp ? new Date(queryResult.timestamp).toLocaleString('ja-JP') : '-'}</span>
                </div>
                {queryResult.status === 'partial' && (
                  <div className="text-status-warn">
                    <p className="font-medium">一部成功</p>
                    <p className="text-xs">{queryResult.message}</p>
                  </div>
                )}
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
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-bg-app transition-colors"
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
                  <tr className="border-b border-bg-table-head">
                    <td className="py-2">周辺地物（表示可能な照会結果）</td>
                    <td className="py-2">
                      {queryResult.features !== undefined ? (
                        Object.keys(layerCounts).length > 0 ? (
                          <span className="text-text-primary">
                            {Object.entries(layerCounts)
                              .map(([layer, count]) => `${LAYER_LABELS[layer] ?? layer} ${count} 件`)
                              .join(' / ')}
                          </span>
                        ) : (
                          <span className="text-text-secondary">該当なし</span>
                        )
                      ) : (
                        <span className="text-text-secondary">未照会</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-bg-table-head">
                    <td className="py-2">DID地区・飛行禁止区域</td>
                    <td className="py-2">
                      {!showProhibitedAreas ? (
                        <span className="text-text-secondary">非表示（レイヤOFF）</span>
                      ) : queryResult.prohibitedAreas !== undefined ? (
                        queryResult.prohibitedAreas.length > 0 ? (
                          <span className="text-text-primary">
                            {queryResult.prohibitedAreas.length} 件（詳細は下表参照）
                          </span>
                        ) : (
                          <span className="text-text-secondary">0 件</span>
                        )
                      ) : (
                        <span className="text-text-secondary">未照会</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">150m AGL（航空法上限）判定</td>
                    <td className="py-2">
                      {queryResult.routeJudgment ? (
                        <span className="text-text-primary">{queryResult.routeJudgment}</span>
                      ) : (
                        <span className="text-text-secondary">未照会</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 地物・飛行禁止区域ごとの交差判定（垂直方向は建物のみ、それ以外は
                簡易・未検証の旨を表示）。 */}
            {routeQueried && detailRows.length > 0 && (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-bg-table-head">
                      <th className="pb-2 font-semibold text-text-primary text-xs">レイヤ</th>
                      <th className="pb-2 font-semibold text-text-primary text-xs">識別子</th>
                      <th className="pb-2 font-semibold text-text-primary text-xs">交差判定</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((row) => (
                      <tr key={row.key} className="border-b border-bg-table-head">
                        <td className="py-2">{row.layer}</td>
                        <td className="py-2 mono text-xs">{row.id}</td>
                        <td className="py-2">{row.intersect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
