import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiCircle, FiLoader } from 'react-icons/fi';
import type { QueryResult } from '../App';
import type { GroundFeatureGroup } from '../api/client';
import { JudgmentDetailBody, QuerySummary } from './resultsContent';

// 改善計画§3-3: 待機状態の段階表示。段階の完了を実際に観測できない場合、
// 完了済みであるように誤認させる表示はしない。ここでは handleQuery（App.tsx）が
// 実際に到達した段階だけを「現在実行中／完了」として示し、未到達の段階は
// 「これから行う処理」として並べるだけにとどめる。
// 「結果を整理」段階は含めない：この後は setQueryResult が同期的に続けて
// 呼ばれ、Reactのバッチ更新により結果ビューへの切り替えが同じ再描画で起きる
// ため、この段階が待機画面として実際に描画されることはない
// （レビュー指摘2026-09-07）。
export type LoadingStage = 'register' | 'features' | 'prohibited';

const LOADING_STAGE_ORDER: LoadingStage[] = ['register', 'features', 'prohibited'];

const LOADING_STAGE_LABELS: Record<LoadingStage, string> = {
  register: '航路を登録',
  features: '周辺地物を照会',
  prohibited: '飛行禁止区域を照会',
};

const LOADING_STAGE_PRIMARY_TEXT: Record<LoadingStage, string> = {
  register: '航路を登録しています',
  features: '周辺データを照会しています',
  prohibited: '飛行禁止区域を照会しています',
};

const RESULT_STATUS_LABELS: Record<'success' | 'partial' | 'error', { label: string; dotClass: string }> = {
  success: { label: '成功', dotClass: 'bg-status-ok' },
  partial: { label: '一部成功', dotClass: 'bg-status-warn' },
  error: { label: '失敗', dotClass: 'bg-status-error' },
};

interface ResultsOverlayProps {
  queryResult: QueryResult;
  showProhibitedAreas: boolean;
  loadingStage: LoadingStage | null;
  elapsedSeconds: number;
  activeLayerLabels: string[];
  onReenter: () => void;
  // §5-2: 「失敗時には再試行・再入力の導線を表示する」。失敗時（status ===
  // 'error'）だけ、既存の handleQuery を同じ入力値のまま呼び直すボタンを表示する。
  onRetry: () => void;
}

// 改善計画§3-1/§3-3/§3-4/§5-3: 左ペイン内に絶対配置される、待機・結果の
// オーバーレイ。position: fixed は使わない。入力ビュー（SettingsPanel）の上に
// 重ね、背景は既存のパネル背景色で不透明にする。結果詳細だけを縦スクロール
// 可能にし、「再入力する」はスクロール領域外の固定フッターに置く。
export default function ResultsOverlay({
  queryResult,
  showProhibitedAreas,
  loadingStage,
  elapsedSeconds,
  activeLayerLabels,
  onReenter,
  onRetry,
}: ResultsOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<GroundFeatureGroup, boolean>>({
    impact: false,
    opportunity: false,
    landuse: false,
  });
  const toggleGroup = (group: GroundFeatureGroup) =>
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  // §5-2追記: 結果オーバーレイが現れたらそこへフォーカスを移す。マウントごとに
  // 1回だけ実行する（App.tsx側で view!=='input' の間だけこのコンポーネントを
  // マウントするため、待機→結果の切替はこのコンポーネント自身の再マウントを
  // 伴わず、フォーカスはユーザーの操作位置を尊重する）。
  useEffect(() => {
    rootRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoadingView = queryResult.status === 'loading';
  const statusInfo =
    queryResult.status === 'success' || queryResult.status === 'partial' || queryResult.status === 'error'
      ? RESULT_STATUS_LABELS[queryResult.status]
      : null;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="region"
      aria-label={isLoadingView ? '航路照会の待機状況' : '航路照会の結果'}
      // §3-2: 縦方向の移動は行わず、短い不透明度の変化だけを許容する。
      // OSのprefers-reduced-motionでは動きを完全に省略する。
      className="absolute inset-0 z-20 flex flex-col bg-bg-panel opacity-100 transition-opacity duration-150 motion-reduce:transition-none focus:outline-none"
    >
      {isLoadingView ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-4 text-center"
          role="status"
          aria-live="polite"
        >
          <FiLoader aria-hidden="true" className="h-7 w-7 animate-spin text-action-primary" />
          <p className="text-sm font-medium text-text-primary">
            {loadingStage ? LOADING_STAGE_PRIMARY_TEXT[loadingStage] : '処理しています'}
          </p>

          <ol className="w-full max-w-[240px] space-y-1.5 text-left">
            {LOADING_STAGE_ORDER.map((stage, index) => {
              const currentIndex = loadingStage ? LOADING_STAGE_ORDER.indexOf(loadingStage) : -1;
              const isDone = currentIndex >= 0 && index < currentIndex;
              const isCurrent = stage === loadingStage;
              return (
                <li key={stage} className="flex items-center gap-2 text-xs">
                  {isDone ? (
                    <FiCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-status-ok" />
                  ) : isCurrent ? (
                    <FiLoader aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin text-action-primary" />
                  ) : (
                    <FiCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                  )}
                  <span className={isCurrent ? 'font-medium text-text-primary' : 'text-text-secondary'}>
                    {LOADING_STAGE_LABELS[stage]}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="text-xs text-text-secondary">
            <p>経過時間: {elapsedSeconds}秒</p>
            {activeLayerLabels.length > 0 && (
              <p className="mt-1">対象レイヤ: {activeLayerLabels.join('、')}</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 結果詳細だけを縦スクロール可能にする。再入力操作はこの領域の外（固定
              フッター）に置き、詳細が長くてもスクロールなしで到達できるようにする。
              min-h-0: flexアイテムの既定の最小高さ（内容の実寸法）を明示的に
              解除する防御的な指定。overflow-y-auto があれば通常は不要だが、
              内容が長い場合にこの要素が意図せず内容の高さまで伸びて
              absolute inset-0 の外側へあふれる事態を確実に防ぐ
              （ユーザー報告2026-09-07を受けて調査：実アプリ側は元々
              問題なかった＝Storybookのプレビューbodyパディングによる
              見かけ上の問題だったが、再発防止として維持する）。 */}
          <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar px-5 py-4 space-y-4">
            <div className="flex items-center gap-2">
              {statusInfo && (
                <>
                  <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} aria-hidden="true" />
                  <span className="text-sm font-semibold text-text-primary">{statusInfo.label}</span>
                </>
              )}
            </div>
            <QuerySummary queryResult={queryResult} hideStatusLabel />
            <div className="pt-2 border-t border-bg-table-head">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-text-secondary">判定詳細</h3>
              {/* text-sm text-text-secondary: JudgmentDetailBody内の各行（li/span）は
                  文字サイズを自前で指定していないため、ここで明示しないとブラウザ既定の
                  text-base（16px）を継承し、周囲（text-xs/text-sm）より急に大きく見える。
                  ResultsPanel.tsx（下部パネル版）の同じ内容ラッパーと同じ指定に揃える
                  （ユーザー報告2026-09-07）。 */}
              <div className="text-sm text-text-secondary">
                <JudgmentDetailBody
                  queryResult={queryResult}
                  showProhibitedAreas={showProhibitedAreas}
                  expandedGroups={expandedGroups}
                  onToggleGroup={toggleGroup}
                />
              </div>
            </div>
          </div>

          {/* 非スクロール領域の固定フッター（改善計画§3-4）。画面下部パネルではなく
              左ペイン内部の操作領域。失敗時は同じ入力値で再試行する導線も
              あわせて置く（§5-2「失敗時には再試行・再入力の導線を表示する」）。 */}
          <div className="shrink-0 border-t border-bg-table-head bg-bg-panel px-5 py-3 space-y-2">
            {queryResult.status === 'error' && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full px-4 py-2 bg-action-primary text-white text-sm font-semibold rounded transition-colors hover:bg-blue-700"
              >
                再試行する
              </button>
            )}
            <button
              type="button"
              onClick={onReenter}
              className={
                queryResult.status === 'error'
                  ? 'w-full px-4 py-2 border border-action-primary text-action-primary text-sm font-semibold rounded transition-colors hover:bg-bg-app'
                  : 'w-full px-4 py-2 bg-action-primary text-white text-sm font-semibold rounded transition-colors hover:bg-blue-700'
              }
            >
              再入力する
            </button>
          </div>
        </>
      )}
    </div>
  );
}
