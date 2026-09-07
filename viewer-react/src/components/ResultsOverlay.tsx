import { FiCheck, FiLoader } from 'react-icons/fi';
import type { QueryResult } from '../App';
import ResultsPanel from './ResultsPanel';

interface ResultsOverlayProps {
  queryResult: QueryResult;
  queryProgressStep: number;
  showResults: boolean;
  showProhibitedAreas: boolean;
  onEditAgain: () => void;
}

const progressSteps = [
  '航路を登録',
  '周辺地物を照会',
  '飛行禁止区域を照会',
  '結果を整理',
];

export default function ResultsOverlay({
  queryResult,
  queryProgressStep,
  showResults,
  showProhibitedAreas,
  onEditAgain,
}: ResultsOverlayProps) {
  const isLoading = queryResult.status === 'loading';

  return (
    <section
      aria-label={isLoading ? '照会中' : '照会結果'}
      aria-hidden={!showResults}
      className={`results-overlay absolute inset-0 z-20 flex flex-col overflow-hidden bg-bg-panel ${
        showResults ? 'entered' : 'exit'
      }`}
    >
      {isLoading ? (
        <LoadingProgress step={queryProgressStep} />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ResultsPanel queryResult={queryResult} showProhibitedAreas={showProhibitedAreas} />
          </div>
          <footer className="shrink-0 border-t border-bg-table-head bg-bg-panel p-3">
            <button
              type="button"
              onClick={onEditAgain}
              className="h-9 w-full rounded bg-action-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
            >
              再入力する
            </button>
          </footer>
        </>
      )}
    </section>
  );
}

function LoadingProgress({ step }: { step: number }) {
  const activeStep = Math.min(Math.max(step, 0), progressSteps.length - 1);
  const messages = [
    '航路を登録しています',
    '周辺データを照会しています',
    '飛行禁止区域を照会しています',
    '結果を整理しています',
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-8 text-center">
      <FiLoader aria-hidden="true" className="h-6 w-6 animate-spin text-action-primary" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text-primary">{messages[activeStep]}</p>
        <p className="text-xs text-text-secondary">照会が完了するまでお待ちください</p>
      </div>
      <ol className="flex w-full max-w-[220px] flex-col gap-2 text-left" aria-label="照会の進捗">
        {progressSteps.map((label, index) => {
          const complete = index < activeStep;
          const current = index === activeStep;
          return (
            <li
              key={label}
              className={`flex items-center gap-2 text-xs ${
                current ? 'font-semibold text-text-primary' : 'text-text-secondary'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  complete
                    ? 'border-status-ok bg-status-ok text-white'
                    : current
                      ? 'border-action-primary text-action-primary'
                      : 'border-bg-table-head'
                }`}
              >
                {complete ? <FiCheck aria-hidden="true" /> : index + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

