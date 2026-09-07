import { useState } from 'react';
import type { QueryResult } from '../App';
import type { GroundFeatureGroup } from '../api/client';
import { AccordionIcon, JudgmentDetailBody, QuerySummary } from './resultsContent';

interface ResultsPanelProps {
  queryResult: QueryResult;
  // 秩父市のDID地区のみ地図描画に対応（MapContainer参照）。それ以外の飛行禁止
  // 区域はジオメトリが無く地図描画できないため、チェックボックスは判定詳細表の
  // 表示/非表示も兼ねる。
  showProhibitedAreas: boolean;
}

export default function ResultsPanel({ queryResult, showProhibitedAreas }: ResultsPanelProps) {
  const [queryExpanded, setQueryExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  // 判定詳細内の入れ子アコーディオン（航路への影響/航路活用の可能性/土地利用）。
  // 既定は折りたたみ。上の概要ブロックで区分ごとの交差状況は分かるため、
  // 内訳を見たい区分だけ開く想定。
  const [expandedGroups, setExpandedGroups] = useState<Record<GroundFeatureGroup, boolean>>({
    impact: false,
    opportunity: false,
    landuse: false,
  });
  const toggleGroup = (group: GroundFeatureGroup) =>
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));

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
          <h2 className="text-sm font-semibold text-text-primary">照会結果</h2>
          <AccordionIcon expanded={queryExpanded} opensUpward />
        </button>
        {queryExpanded && (
          <div className="px-6 py-4 bg-bg-app">
            <QuerySummary queryResult={queryResult} />
          </div>
        )}
      </div>

      {/* Details Section */}
      <div>
        <button
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-bg-app transition-colors"
        >
          <h2 className="text-sm font-semibold text-text-primary">判定詳細</h2>
          <AccordionIcon expanded={detailsExpanded} opensUpward />
        </button>
        {detailsExpanded && (
          <div className="px-6 py-4 bg-bg-app text-sm text-text-secondary border-t border-bg-table-head">
            <JudgmentDetailBody
              queryResult={queryResult}
              showProhibitedAreas={showProhibitedAreas}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
            />
          </div>
        )}
      </div>
    </div>
  );
}
