import { useState } from 'react';
import type { QueryResult } from '../App';
import type { GroundFeatureGroup } from '../api/client';

interface ResultsPanelProps {
  queryResult: QueryResult;
  // 秩父市のDID地区のみ地図描画に対応（MapContainer参照）。それ以外の飛行禁止
  // 区域はジオメトリが無く地図描画できないため、チェックボックスは判定詳細表の
  // 表示/非表示も兼ねる。
  showProhibitedAreas: boolean;
}

// BFF が返す layer 値の表示名。viewer/src/plateau_route_judgment.py と対応。
const LAYER_LABELS: Record<string, string> = {
  building: '建物',
  road: '道路',
  landslide: '土砂災害',
  flood: '洪水浸水',
  landuse: '土地利用',
};

// 6-13: 結果画面も地図凡例と同じ「航路への影響」/「航路活用の可能性」で区分する。
// 災害リスク区域（土砂災害・洪水浸水）を、航路を妨げる障害物や飛行禁止区域と
// 同じ意味で誤認させないための区分（改善タスク§2・6-13）。
const GROUP_LABELS: Record<GroundFeatureGroup, string> = {
  impact: '航路への影響',
  opportunity: '航路活用の可能性',
  landuse: '土地利用（影響/活用は分類による）',
};
const GROUP_ORDER: GroundFeatureGroup[] = ['impact', 'opportunity', 'landuse'];

export default function ResultsPanel({ queryResult, showProhibitedAreas }: ResultsPanelProps) {
  const [queryExpanded, setQueryExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const features = queryResult.features ?? [];
  const nearbySummary = queryResult.nearbySummary ?? [];
  // partial は「地物照会が失敗」と「地物は成功したが飛行禁止区域の照会だけ失敗」の
  // 両方を意味する。航路登録が成功していれば、少なくとも航路IDと取得試行結果は表示する。
  const routeQueried = queryResult.status === 'success' || queryResult.status === 'partial';
  const hasAnyContent = features.length > 0 || nearbySummary.length > 0;

  return (
    // relative z-20: MapContainer側の凡例（z-10）より確実に前面へ出し、判定詳細
    // アコーディオンを開いたときに地図側の要素と重なって操作できなくなる不具合を
    // 防ぐ（2026-08-17報告）。
    <div className="relative z-20 border-t border-brand-blue-light/20 bg-bg-panel flex flex-col">
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
                {/* 6-11: 件数だけの表示（例:「土砂災害 1件」）は航路判断を誤らせるため
                    行わない。ここでは「航路との関係を確認できた地物がある/ない」までを
                    示し、内容は下の判定詳細（文章）を参照させる。 */}
                <div className="flex justify-between">
                  <span>周辺の状況:</span>
                  {queryResult.features !== undefined ? (
                    <span className="text-text-primary font-medium">
                      {hasAnyContent ? '判定詳細を参照' : '対象範囲内に該当データなし'}
                    </span>
                  ) : (
                    <span className="text-status-error font-medium">取得失敗</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>取得時刻:</span>
                  <span className="text-text-secondary text-xs">{queryResult.timestamp ? new Date(queryResult.timestamp).toLocaleString('ja-JP') : '-'}</span>
                </div>
                {queryResult.datasetMeta && (
                  <div className="flex justify-between text-xs">
                    <span>データ出典:</span>
                    <span className="text-text-secondary">
                      {queryResult.datasetMeta.source}（{queryResult.datasetMeta.dataDate}時点）
                    </span>
                  </div>
                )}
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
          <div className="px-6 py-4 bg-bg-app text-sm text-text-secondary border-t border-bg-table-head space-y-4">
            {!routeQueried && (
              <p className="text-text-secondary">航路照会後にここへ表示されます。</p>
            )}

            {routeQueried && !hasAnyContent && showProhibitedAreas === false && (
              <p className="text-text-secondary">対象範囲内に該当データはありませんでした。</p>
            )}

            {routeQueried &&
              GROUP_ORDER.map((group) => {
                const groupFeatures = features.filter((f) => f.group === group);
                const groupSummaries = nearbySummary.filter((s) => s.group === group);
                if (groupFeatures.length === 0 && groupSummaries.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="font-semibold text-text-primary text-xs mb-1">
                      {GROUP_LABELS[group]}
                    </div>
                    {/* 6-12: 土砂災害・洪水浸水（opportunityグループ）は区域データで
                        あって発災状況や飛行禁止の確定判断ではないことを明記する。
                        行ごとの繰り返しではなく、グループ見出しに1回だけ添える。 */}
                    {group === 'opportunity' && queryResult.landslideFloodDisclaimer && (
                      <p className="text-xs text-status-warn mb-2">
                        {queryResult.landslideFloodDisclaimer}
                      </p>
                    )}
                    <ul className="space-y-1">
                      {groupFeatures.map((f) => (
                        <li key={`feature-${f.id}`} className="text-text-primary">
                          <span className="text-text-secondary">[{LAYER_LABELS[f.layer] ?? f.layer}]</span>{' '}
                          {f.intersect}
                        </li>
                      ))}
                      {groupSummaries.map((s) => (
                        <li
                          key={`summary-${s.layer}-${s.class_label ?? 'none'}`}
                          className="text-text-secondary"
                        >
                          <span>[{LAYER_LABELS[s.layer] ?? s.layer}]</span> {s.sentence}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

            {/* DID地区（人口集中地区）等の飛行禁止区域。ジオメトリを持たないため
                交差判定は簡易表現になる（既存挙動を維持）。 */}
            {routeQueried && showProhibitedAreas && (queryResult.prohibitedAreas?.length ?? 0) > 0 && (
              <div>
                <div className="font-semibold text-text-primary text-xs mb-1">
                  {GROUP_LABELS.impact}（飛行禁止区域）
                </div>
                <ul className="space-y-1">
                  {queryResult.prohibitedAreas!.map((a) => (
                    <li key={`prohibited-${a.id}`} className="text-text-primary">
                      <span className="text-text-secondary">[DID地区]</span> {a.name ?? a.id}:{' '}
                      {a.intersect ?? '未検証'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {routeQueried && (
              <div className="pt-2 border-t border-bg-table-head text-xs">
                150m AGL（航空法上限）判定:{' '}
                {queryResult.routeJudgment ? (
                  <span className="text-text-primary">{queryResult.routeJudgment}</span>
                ) : (
                  <span className="text-text-secondary">未照会</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
