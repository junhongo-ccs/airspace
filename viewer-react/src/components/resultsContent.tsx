import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { QueryResult } from '../App';
import type { GroundFeatureGroup } from '../api/client';
import { GROUP_LABELS, GROUP_ORDER, LAYER_LABELS, buildingHeightSummary } from './resultsConstants';

export function AccordionIcon({ expanded, opensUpward = false }: { expanded: boolean; opensUpward?: boolean }) {
  // 親パネルが下部から上方向へ展開する構成のときは、開く前は上向き、開いた後は
  // 閉じる方向の下向きを示す。それ以外（左ペイン内オーバーレイ等）は従来の向き。
  const showUpward = opensUpward ? !expanded : expanded;

  return showUpward ? (
    <FiChevronUp aria-hidden="true" className="h-4 w-4 shrink-0 text-text-secondary" />
  ) : (
    <FiChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-text-secondary" />
  );
}

// 「照会結果」相当のブロック：航路ID・周辺の状況・取得時刻・データ出典・
// 一部成功/エラーの補足メッセージ。ResultsPanel（下部パネル）と ResultsOverlay
// （左ペイン内オーバーレイ）の双方から使う共通の内容ロジック（改善計画§5-1）。
// hideStatusLabel: ResultsOverlay は「結果状態」（成功/一部成功/失敗）を
// 独自のバッジで表示するため（改善計画§3-4 項目1）、ここでの重複した見出しを
// 省略できるようにする。ResultsPanel は自前のバッジを持たないため既定値のまま使う。
export function QuerySummary({
  queryResult,
  hideStatusLabel = false,
}: {
  queryResult: QueryResult;
  hideStatusLabel?: boolean;
}) {
  const routeQueried = queryResult.status === 'success' || queryResult.status === 'partial';
  const hasAnyContent = (queryResult.features?.length ?? 0) > 0 || (queryResult.nearbySummary?.length ?? 0) > 0;

  return (
    <div className="text-sm text-text-secondary">
      {queryResult.status === 'loading' && <p className="text-status-idle">実行中…</p>}
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
            <span className="text-text-secondary text-xs">
              {queryResult.timestamp ? new Date(queryResult.timestamp).toLocaleString('ja-JP') : '-'}
            </span>
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
              {!hideStatusLabel && <p className="font-medium">一部成功</p>}
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
  );
}

interface JudgmentDetailBodyProps {
  queryResult: QueryResult;
  showProhibitedAreas: boolean;
  expandedGroups: Record<GroundFeatureGroup, boolean>;
  onToggleGroup: (group: GroundFeatureGroup) => void;
}

// 「判定詳細」相当のブロック：概要（平面上の重なり件数・高さ方向）＋区分ごとの
// 入れ子アコーディオン＋AGL判定。ResultsPanel/ResultsOverlay 共通の内容ロジック。
export function JudgmentDetailBody({
  queryResult,
  showProhibitedAreas,
  expandedGroups,
  onToggleGroup,
}: JudgmentDetailBodyProps) {
  const features = queryResult.features ?? [];
  const nearbySummary = queryResult.nearbySummary ?? [];
  const routeQueried = queryResult.status === 'success' || queryResult.status === 'partial';
  const hasAnyContent = features.length > 0 || nearbySummary.length > 0;

  return (
    <div className="space-y-4">
      {!routeQueried && <p className="text-text-secondary">航路照会後にここへ表示されます。</p>}

      {routeQueried && !hasAnyContent && showProhibitedAreas === false && (
        <p className="text-text-secondary">対象範囲内に該当データはありませんでした。</p>
      )}

      {/* 概要: 平面上の重なり件数と、建物の高さ方向の判定を分けて示す。
          同じ「交差」という語で別の判定軸を表して矛盾に見えることを防ぐ。 */}
      {routeQueried && hasAnyContent && (
        <div className="bg-bg-panel rounded p-3 text-xs space-y-1 border border-bg-table-head">
          {GROUP_ORDER.map((group) => {
            const intersectCount = features.filter((f) => f.group === group).length;
            const nearbyCount = nearbySummary
              .filter((s) => s.group === group)
              .reduce((sum, s) => sum + s.count, 0);
            const heightSummary = buildingHeightSummary(features.filter((feature) => feature.group === group));
            if (intersectCount === 0 && nearbyCount === 0) return null;
            return (
              <div key={`summary-${group}`} className="flex justify-between gap-4">
                <span className="text-text-secondary">{GROUP_LABELS[group]}:</span>
                <span className="text-text-primary font-medium text-right space-y-1">
                  {intersectCount > 0 ? (
                    <span className="block">平面上で航路と重なる地物 {intersectCount}件</span>
                  ) : (
                    <span className="block">平面上の重なりなし（付近に{nearbyCount}件）</span>
                  )}
                  {heightSummary && <span className="block text-text-secondary">{heightSummary}</span>}
                </span>
              </div>
            );
          })}
          {showProhibitedAreas && (queryResult.prohibitedAreas?.length ?? 0) > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-text-secondary">人口集中地区（飛行禁止）:</span>
              <span className="text-text-primary font-medium">{queryResult.prohibitedAreas!.length}件</span>
            </div>
          )}
        </div>
      )}

      {/* 入れ子アコーディオン。DID地区（ジオメトリを持たず簡易表現の飛行禁止区域）は
          区分としては「航路への影響」に含まれるため、独立の見出しにはせずimpact
          グループの中に加える。 */}
      {routeQueried &&
        GROUP_ORDER.map((group) => {
          const groupFeatures = features.filter((f) => f.group === group);
          const groupSummaries = nearbySummary.filter((s) => s.group === group);
          const groupProhibitedAreas =
            group === 'impact' && showProhibitedAreas ? (queryResult.prohibitedAreas ?? []) : [];
          if (groupFeatures.length === 0 && groupSummaries.length === 0 && groupProhibitedAreas.length === 0) {
            return null;
          }
          const isOpen = expandedGroups[group];
          return (
            <div key={group} className="border border-bg-table-head rounded overflow-hidden">
              <button
                onClick={() => onToggleGroup(group)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-bg-panel transition-colors text-left"
              >
                <span className="font-semibold text-text-primary text-xs">{GROUP_LABELS[group]}</span>
                <AccordionIcon expanded={isOpen} />
              </button>
              {isOpen && (
                <div className="px-3 py-2 border-t border-bg-table-head bg-bg-panel">
                  {/* 6-12: 土砂災害・洪水浸水（opportunityグループ）は区域データで
                      あって発災状況や飛行禁止の確定判断ではないことを明記する。
                      行ごとの繰り返しではなく、グループ見出しに1回だけ添える。 */}
                  {group === 'opportunity' && queryResult.landslideFloodDisclaimer && (
                    <p className="text-xs text-status-warn mb-2">{queryResult.landslideFloodDisclaimer}</p>
                  )}
                  <ul className="space-y-1 max-h-64 overflow-y-auto thin-scrollbar pr-1">
                    {groupFeatures.map((f) => (
                      <li key={`feature-${f.id}`} className="text-text-primary">
                        <span className="text-text-secondary">[{LAYER_LABELS[f.layer] ?? f.layer}]</span>{' '}
                        {f.layer === 'building' ? `平面上で航路と重なる／${f.intersect}` : f.intersect}
                      </li>
                    ))}
                    {groupSummaries.map((s) => (
                      <li key={`summary-${s.layer}-${s.class_label ?? 'none'}`} className="text-text-secondary">
                        <span>[{LAYER_LABELS[s.layer] ?? s.layer}]</span> {s.sentence}
                      </li>
                    ))}
                    {groupProhibitedAreas.map((a) => (
                      <li key={`prohibited-${a.id}`} className="text-text-primary">
                        <span className="text-text-secondary">[人口集中地区（飛行禁止）]</span> {a.name ?? a.id}:{' '}
                        {a.intersect ?? '未検証'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

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
  );
}
