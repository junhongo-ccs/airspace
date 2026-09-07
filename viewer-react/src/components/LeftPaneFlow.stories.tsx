import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import CollapsibleSidebar from './CollapsibleSidebar';
import SettingsPanel from './SettingsPanel';
import ResultsOverlay, { type LoadingStage } from './ResultsOverlay';
import type { QueryResult } from '../App';
import type { PlateauDatasetMeta } from '../api/client';

// 左ペイン結果オーバーレイ改善計画: App.tsx の実際の構成（CollapsibleSidebar ＞
// relative h-full ラッパー ＞ SettingsPanel(inert) ＋ ResultsOverlay）を、実API
// を叩かずに Storybook 上で通しで確認するための合成ストーリー。
// handleQuery のタイミング（登録→周辺地物→飛行禁止区域→結果表示）を
// setTimeout で模した点以外は App.tsx の状態遷移ロジックと同じにしてある。

const datasetMeta: PlateauDatasetMeta = {
  source: 'PLATEAU 秩父市2025',
  dataDate: '2025-03-31',
};

type Outcome = 'success' | 'partial' | 'error';

function buildResult(outcome: Outcome): QueryResult {
  if (outcome === 'error') {
    return { status: 'error', message: '航路登録に失敗しました: HTTP 500: Internal Server Error' };
  }
  if (outcome === 'partial') {
    return {
      status: 'partial',
      routeId: 'route-demo-partial',
      timestamp: new Date().toISOString(),
      message: '航路は登録できましたが、地物照会に失敗しました: HTTP 503: Service Unavailable',
    };
  }
  return {
    status: 'success',
    routeId: 'route-demo-success',
    features: [
      {
        id: 'landslide-1',
        layer: 'landslide',
        group: 'opportunity',
        class_label: '土砂災害警戒区域（急傾斜地）',
        intersect: '航路が土砂災害警戒区域（急傾斜地）と交差',
      },
    ],
    nearbySummary: [
      {
        layer: 'road',
        group: 'impact',
        class_label: null,
        count: 4,
        sentence: '道路4件が付近にありますが航路とは交差していません',
      },
    ],
    routeJudgment: 'AGL100mは150m未満のため、航空法上の許可は不要（ほかの要件は未確認）',
    prohibitedAreas: [],
    datasetMeta,
    landslideFloodDisclaimer:
      '土砂災害・洪水浸水は区域データであり、発災状況や飛行禁止の確定判断ではありません',
    timestamp: new Date().toISOString(),
  };
}

const STAGE_DELAY_MS = 250;

interface ConfirmedRoute {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

function LeftPaneDemo({ outcome }: { outcome: Outcome }) {
  const [view, setView] = useState<'input' | 'loading' | 'result'>('input');
  const [loadingStage, setLoadingStage] = useState<LoadingStage | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);
  // App.tsx と同じく、実座標入力（編集途中の値）と地図に渡す確定航路
  // （confirmedRoute）を分ける。地図プレースホルダー側に読み出し表示することで、
  // 「値を変更して再照会している間も、地図には旧航路を表示し続ける」という
  // confirmedRoute の本質を Storybook 上で直接検証できるようにする
  // （レビュー指摘2026-09-07）。
  const [startLat, setStartLat] = useState(35.975841);
  const [startLon, setStartLon] = useState(139.065854);
  const [endLat, setEndLat] = useState(35.98839);
  const [endLon, setEndLon] = useState(139.046579);
  const [confirmedRoute, setConfirmedRoute] = useState<ConfirmedRoute | null>(null);

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const handleQuery = useCallback(async () => {
    setIsLoading(true);
    setView('loading');
    setLoadingStage('register');
    setQueryResult({ status: 'loading' });

    await wait(STAGE_DELAY_MS);
    // App.tsx と同じタイミング（航路登録の成功直後）で確定航路を更新する。
    // ここより後（周辺地物・飛行禁止区域の照会中や失敗時）は更新しないため、
    // このクエリが待機・失敗しても直前の確定航路が地図に残り続ける。
    setConfirmedRoute({ startLat, startLon, endLat, endLon });
    setLoadingStage('features');
    await wait(STAGE_DELAY_MS);
    setLoadingStage('prohibited');
    await wait(STAGE_DELAY_MS);

    setQueryResult(buildResult(outcome));
    setIsLoading(false);
    setLoadingStage(null);
    setView('result');
  }, [outcome, startLat, startLon, endLat, endLon]);

  const handleReenter = useCallback(() => setView('input'), []);

  return (
    // App.tsx の実際の入れ子（flex-col h-screen overflow-hidden ＞
    // flex flex-1 overflow-hidden の2段構成）を忠実に再現する。
    // 高さは h-screen ではなく大きめの固定値にする：Storybookのプレビュー
    // iframeは（このコンポーネントとは無関係に）body に既定でパディングを
    // 持つため、h-screen（100vh）を直接使うとStorybook側の余白分だけページ
    // 全体がスクロール可能になり、実アプリでは存在しない見かけ上の問題に
    // 見える（2026-09-07に実アプリ（vite dev）で直接計測し、ページのはみ出しが
    // 無いこと・フッターがビューポート最下部と誤差1px未満で一致することを確認済み）。
    <div data-testid="left-pane-demo-root" className="flex h-[1000px] flex-col overflow-hidden bg-bg-app">
      <div className="flex flex-1 overflow-hidden">
      <CollapsibleSidebar>
        <div className="relative h-full">
          <div className="h-full" inert={view !== 'input'} aria-hidden={view !== 'input'}>
            <SettingsPanel
              connection={{ connected: true, state: 'connected', mock: false, baseUrl: 'http://localhost:8001' }}
              startLat={startLat}
              setStartLat={setStartLat}
              startLon={startLon}
              setStartLon={setStartLon}
              endLat={endLat}
              setEndLat={setEndLat}
              endLon={endLon}
              setEndLon={setEndLon}
              aglM={100}
              setAglM={fn()}
              showRoute={true}
              setShowRoute={fn()}
              showBuildings={true}
              setShowBuildings={fn()}
              showProhibitedAreas={true}
              setShowProhibitedAreas={fn()}
              showRoad={true}
              setShowRoad={fn()}
              showLandslide={true}
              setShowLandslide={fn()}
              showFlood={true}
              setShowFlood={fn()}
              showLanduse={false}
              setShowLanduse={fn()}
              onQuery={handleQuery}
              isLoading={isLoading}
            />
          </div>
          {view !== 'input' && (
            <ResultsOverlay
              queryResult={queryResult}
              showProhibitedAreas={true}
              loadingStage={loadingStage}
              elapsedSeconds={0}
              activeLayerLabels={['建物', '道路', '土砂災害警戒区域', '人口集中地区（飛行禁止）']}
              onReenter={handleReenter}
              onRetry={handleQuery}
            />
          )}
        </div>
      </CollapsibleSidebar>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#e8f3fa_25%,#f8fbfd_25%,#f8fbfd_50%,#e8f3fa_50%,#e8f3fa_75%,#f8fbfd_75%)] bg-[length:24px_24px] p-6 text-sm text-text-secondary">
        <p>地図領域（左ペインの状態に関わらず常時表示）</p>
        {/* 実アプリではMapContainerが地図上に描画する航路そのもの。ここでは
            座標を読み出し表示することで confirmedRoute の値を検証できるように
            する（実MapLibreの代わり）。 */}
        <p data-testid="confirmed-route-readout" className="text-xs">
          {confirmedRoute
            ? `地図に表示中の航路: (${confirmedRoute.startLat}, ${confirmedRoute.startLon}) → (${confirmedRoute.endLat}, ${confirmedRoute.endLon})`
            : '地図に表示中の航路: なし'}
        </p>
      </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Flows/LeftPaneOverlay',
  component: LeftPaneDemo,
  tags: ['ai-generated'],
  args: {
    outcome: 'success',
  },
  argTypes: {
    outcome: {
      control: 'radio',
      options: ['success', 'partial', 'error'],
    },
  },
} satisfies Meta<typeof LeftPaneDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

// 入力 → 照会ボタン押下 → 待機（段階表示） → 結果 → 再入力 → 入力、という
// 改善計画の一連の状態遷移を実際にクリックして確認する。受入条件のうち
// 「照会開始後、左ペインは空白にならない」「結果表示中は背後の入力が操作
// できない」「再入力時に地図・入力値が保持される」をここで検証する。
export const FullFlow: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const queryButton = canvas.getByRole('button', { name: '航路を登録して周辺データを照会' });
    await userEvent.click(queryButton);

    // 待機オーバーレイが空白にならず、段階表示が出る。
    await expect(await canvas.findByText('航路を登録しています')).toBeVisible();

    // 背後の入力フォームは inert により、視覚的には残るがポインタ操作・Tab移動・
    // 支援技術のいずれからも到達不可能になる（CSS上の可視性は変えないため
    // toBeVisible では検出できない。inert/aria-hidden な祖先を持つことを確認する）。
    const startLatInput = canvas.getByLabelText('始点 緯度');
    await expect(startLatInput.closest('[inert]')).not.toBeNull();
    await expect(startLatInput.closest('[aria-hidden="true"]')).not.toBeNull();

    // 段階が進み、最終的に結果ビューへ切り替わる。
    await waitFor(() => expect(canvas.getByText('成功')).toBeVisible(), { timeout: 3000 });

    const reenterButton = canvas.getByRole('button', { name: '再入力する' });
    await expect(reenterButton).toBeVisible();

    // 「再入力する」は都度、左ペイン（＝この一連のコンポーネントの実際の
    // 高さいっぱい）の最下部に来る。ボタン自体の下にはデザイン上のパディング
    // （py-3、design.md §3-2 パネル内部12px）があるため、判定はフッター
    // コンテナの下端で行う。基準はこのデコレータの実コンテナ（1000px固定）で、
    // window.innerHeight は使わない — Storybookのプレビューiframeはbodyに
    // このコンポーネントとは無関係な既定パディングを持ち、window.innerHeight
    // 基準の判定はその分だけ誤検知する（2026-09-07 実アプリ（vite dev）で
    // ページのはみ出し0px・フッター下端とビューポート下端の差1px未満を直接
    // 計測し、実アプリ側は既に正しいことを確認済み）。
    const demoRoot = canvasElement.querySelector('[data-testid="left-pane-demo-root"]');
    if (!demoRoot) throw new Error('left-pane-demo-root not found');
    const footer = reenterButton.closest('div');
    if (!footer) throw new Error('footer container not found');
    const rootRect = demoRoot.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    await expect(rootRect.bottom - footerRect.bottom).toBeLessThan(2);

    await userEvent.click(reenterButton);

    // 再入力後は入力フォームへ戻り、値が保持されている。
    await expect(await canvas.findByLabelText('始点 緯度')).toHaveValue(35.975841);
    await expect(canvas.queryByText('再入力する')).not.toBeInTheDocument();
  },
};

export const PartialOutcome: Story = {
  args: { outcome: 'partial' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '航路を登録して周辺データを照会' }));
    await waitFor(() => expect(canvas.getByText('一部成功')).toBeVisible(), { timeout: 3000 });
  },
};

export const ErrorOutcome: Story = {
  args: { outcome: 'error' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '航路を登録して周辺データを照会' }));
    await waitFor(() => expect(canvas.getByText('失敗')).toBeVisible(), { timeout: 3000 });

    // 「再試行する」は handleQuery をそのまま呼び直し、同じ入力値で再度
    // 待機→結果へ遷移する（§5-2「失敗時には再試行・再入力の導線を表示する」）。
    await userEvent.click(canvas.getByRole('button', { name: '再試行する' }));
    await expect(await canvas.findByText('航路を登録しています')).toBeVisible();
    await waitFor(() => expect(canvas.getByText('失敗')).toBeVisible(), { timeout: 3000 });
  },
};

// confirmedRoute の本質（改善計画§3-5）: 値を変更して再照会している間も、
// 地図には「最後に照会成功した航路」を表示し続け、queryResult.status が
// 一時的に loading になっても消えない。新しい航路登録が成功した時点でだけ
// 切り替わる（レビュー指摘2026-09-07：Storybookの一気通貫フローでは
// これまで未検証だった）。
export const RouteStaysDuringRequery: Story = {
  play: async ({ canvas, userEvent }) => {
    // 1回目の照会で確定航路を作る。
    await userEvent.click(canvas.getByRole('button', { name: '航路を登録して周辺データを照会' }));
    await waitFor(() => expect(canvas.getByText('成功')).toBeVisible(), { timeout: 3000 });
    const readout = canvas.getByTestId('confirmed-route-readout');
    await expect(readout).toHaveTextContent('35.975841');

    // 再入力して始点緯度だけ変更する。
    await userEvent.click(canvas.getByRole('button', { name: '再入力する' }));
    const startLatInput = await canvas.findByLabelText('始点 緯度');
    await userEvent.clear(startLatInput);
    await userEvent.type(startLatInput, '36.1');

    // 2回目の照会を開始した直後（待機中）は、まだ1回目の航路が地図表示のまま。
    await userEvent.click(canvas.getByRole('button', { name: '航路を登録して周辺データを照会' }));
    await expect(await canvas.findByText('航路を登録しています')).toBeVisible();
    await expect(readout).toHaveTextContent('35.975841');

    // 航路登録段階を終える（周辺地物を照会し始める）と、新しい航路へ切り替わる。
    await waitFor(() => expect(canvas.getByText('周辺データを照会しています')).toBeVisible(), {
      timeout: 3000,
    });
    await expect(readout).toHaveTextContent('36.1');

    // 最終的に結果ビューへ到達する。
    await waitFor(() => expect(canvas.getByText('成功')).toBeVisible(), { timeout: 3000 });
  },
};
