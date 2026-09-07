import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import ResultsOverlay from './ResultsOverlay';
import type { QueryResult } from '../App';
import type { GroundFeature, NearbyFeatureSummary, ProhibitedArea, PlateauDatasetMeta } from '../api/client';

// 左ペイン結果オーバーレイ改善計画§3-1: 左ペイン幅320px、高さは可変。
// absolute inset-0 で配置するコンポーネントなので、relative な親コンテナで包む。
const meta = {
  component: ResultsOverlay,
  tags: ['ai-generated'],
  decorators: [
    (Story) => (
      <div className="relative h-[640px] w-80 overflow-hidden border border-brand-blue-light/20 bg-bg-panel">
        <Story />
      </div>
    ),
  ],
  args: {
    showProhibitedAreas: true,
    loadingStage: null,
    elapsedSeconds: 0,
    activeLayerLabels: [],
    onReenter: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof ResultsOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

// §3-3: 待機状態は空白にしない。現在の主状態・段階表示・経過時間・対象レイヤを示す。
export const Loading: Story = {
  args: {
    queryResult: { status: 'loading' },
    loadingStage: 'features',
    elapsedSeconds: 4,
    activeLayerLabels: ['建物', '道路', '人口集中地区（飛行禁止）'],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('周辺データを照会しています')).toBeVisible();
    await expect(canvas.getByText('航路を登録')).toBeVisible();
    await expect(canvas.getByText('経過時間: 4秒')).toBeVisible();
    await expect(canvas.getByText(/対象レイヤ/)).toBeVisible();
  },
};

const datasetMeta: PlateauDatasetMeta = {
  source: 'PLATEAU 秩父市2025',
  dataDate: '2025-03-31',
};

const features: GroundFeature[] = [
  {
    id: 'landslide-1',
    layer: 'landslide',
    group: 'opportunity',
    class_label: '土砂災害警戒区域（急傾斜地）',
    intersect: '航路が土砂災害警戒区域（急傾斜地）と交差',
  },
];

const nearbySummary: NearbyFeatureSummary[] = [
  {
    layer: 'road',
    group: 'impact',
    class_label: null,
    count: 4,
    sentence: '道路4件が付近にありますが航路とは交差していません',
  },
];

const prohibitedAreas: ProhibitedArea[] = [
  {
    id: 'did-1',
    name: '秩父市DID地区',
    source: '国土数値情報A16-2020',
    is_poc: true,
    intersect: '要確認（ジオメトリ未提供）',
    rings: null,
  },
];

// §3-4: 結果状態・要約・判定詳細アコーディオン・再入力を、この順で1つの
// オーバーレイに表示する。「再入力する」は非スクロール領域（固定フッター）にある。
export const SuccessWithData: Story = {
  args: {
    queryResult: {
      status: 'success',
      routeId: 'route-abc123',
      features,
      nearbySummary,
      routeJudgment: 'AGL100mは150m未満のため、航空法上の許可は不要（ほかの要件は未確認）',
      prohibitedAreas,
      datasetMeta,
      landslideFloodDisclaimer:
        '土砂災害・洪水浸水は区域データであり、発災状況や飛行禁止の確定判断ではありません',
      timestamp: '2026-08-19T10:00:00Z',
    } satisfies QueryResult,
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('成功')).toBeVisible();
    // 「再入力する」はスクロール前から常に到達できる（固定フッター）。
    const reenterButton = canvas.getByRole('button', { name: '再入力する' });
    await expect(reenterButton).toBeVisible();
    // 「再試行する」は失敗時だけの導線（ErrorState参照）。
    await expect(canvas.queryByRole('button', { name: '再試行する' })).toBeNull();

    const opportunityButton = canvas.getByRole('button', { name: /航路活用の可能性/ });
    await userEvent.click(opportunityButton);
    await expect(
      await canvas.findByText('土砂災害・洪水浸水は区域データであり、発災状況や飛行禁止の確定判断ではありません')
    ).toBeVisible();

    await userEvent.click(reenterButton);
    await expect(reenterButton).toBeEnabled();
  },
};

export const PartialWithMessage: Story = {
  args: {
    queryResult: {
      status: 'partial',
      routeId: 'route-partial',
      timestamp: '2026-08-19T10:10:00Z',
      message: '航路は登録できましたが、地物照会に失敗しました: HTTP 503: Service Unavailable',
    } satisfies QueryResult,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('一部成功')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '再入力する' })).toBeVisible();
  },
};

// §5-2「失敗時には再試行・再入力の導線を表示する」。失敗時だけ「再試行する」を
// 併記する（成功/一部成功では表示しない、SuccessWithData/PartialWithMessage参照）。
export const ErrorState: Story = {
  args: {
    queryResult: {
      status: 'error',
      message: '航路登録に失敗しました: HTTP 500: Internal Server Error',
    } satisfies QueryResult,
    onRetry: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('失敗')).toBeVisible();
    await expect(
      canvas.getByText('航路登録に失敗しました: HTTP 500: Internal Server Error')
    ).toBeVisible();
    // 失敗時も再入力ボタンから即座に入力ビューへ戻れる。
    await expect(canvas.getByRole('button', { name: '再入力する' })).toBeEnabled();

    const retryButton = canvas.getByRole('button', { name: '再試行する' });
    await expect(retryButton).toBeEnabled();
    await userEvent.click(retryButton);
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const EmptyResult: Story = {
  args: {
    showProhibitedAreas: false,
    queryResult: {
      status: 'success',
      routeId: 'route-empty',
      features: [],
      nearbySummary: [],
      datasetMeta,
      timestamp: '2026-08-19T10:05:00Z',
    } satisfies QueryResult,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('対象範囲内に該当データなし')).toBeVisible();
    await expect(canvas.getByText('対象範囲内に該当データはありませんでした。')).toBeVisible();
  },
};

// 受入条件: 「再入力する」は結果詳細の長さにかかわらず、最初の表示領域内で
// 操作できる（スクロールせずに到達可能）。多数の地物で判定詳細が長くなる
// ケースを再現し、フッターがスクロール領域の外にあることを確認する。
const manyFeatures: GroundFeature[] = Array.from({ length: 40 }, (_, i) => ({
  id: `building-${i}`,
  layer: 'building' as const,
  group: 'impact' as const,
  class_label: null,
  intersect:
    i % 2 === 0
      ? `交差なし（高さ方向・建物高${4 + (i % 5)}.0m・暫定許容差±2m）`
      : `要確認（高さ方向・建物高${10 + (i % 8)}.0m・暫定許容差±2m）`,
}));

export const LongDetailsFooterReachable: Story = {
  args: {
    queryResult: {
      status: 'success',
      routeId: 'route-long',
      features: manyFeatures,
      nearbySummary: [],
      datasetMeta,
      routeJudgment: 'AGL100mは150m未満のため、航空法上の許可は不要（ほかの要件は未確認）',
      timestamp: '2026-08-20T10:00:00Z',
    } satisfies QueryResult,
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '航路への影響' }));
    // アコーディオンを開いて詳細を長くしても、フッターの「再入力する」は
    // （固定フッターのため）スクロールなしで常にDOM上に存在し操作できる。
    const reenterButton = canvas.getByRole('button', { name: '再入力する' });
    await expect(reenterButton).toBeVisible();
    await expect(reenterButton).toBeEnabled();
  },
};
