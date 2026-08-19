import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import ResultsPanel from './ResultsPanel';
import type { QueryResult } from '../App';
import type { GroundFeature, NearbyFeatureSummary, ProhibitedArea, PlateauDatasetMeta } from '../api/client';

const meta = {
  component: ResultsPanel,
  tags: ['ai-generated'],
  args: {
    showProhibitedAreas: true,
  },
} satisfies Meta<typeof ResultsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { queryResult: { status: 'loading' } },
};

const datasetMeta: PlateauDatasetMeta = {
  source: 'PLATEAU 秩父市2025',
  dataDate: '2025-03-31',
};

// impact（road）はnearbySummaryのみ＝交差なし、opportunity（landslide）は
// 実際に交差、という組み合わせにして「交差 N件」/「交差なし（付近にN件）」
// （6-11）の書き分けが両方1回ずつ確認できるようにする。
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

// 6-13/改善タスク§2: 「航路への影響」「航路活用の可能性」の概要・判定詳細に加え、
// opportunityグループを開くと6-12の免責文言が見出しに1回だけ添えられることを確認する。
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
    // 概要ブロック（交差件数の書き分け、6-11）は判定詳細アコーディオンの中にある。
    const detailsButton = canvas.getByRole('button', { name: /判定詳細/ });
    await userEvent.click(detailsButton);
    await expect(canvas.getByText('交差 1件')).toBeVisible();
    await expect(canvas.getByText('交差なし（付近に4件）')).toBeVisible();

    // 凡例と同じアコーディオン操作でopportunityグループを展開すると免責文言が出る。
    const opportunityButton = canvas.getByRole('button', { name: /航路活用の可能性/ });
    await userEvent.click(opportunityButton);
    await expect(
      await canvas.findByText('土砂災害・洪水浸水は区域データであり、発災状況や飛行禁止の確定判断ではありません')
    ).toBeVisible();
  },
};

// 該当データなし・飛行禁止区域レイヤーOFFのケース（対象範囲外や交差ゼロ）。
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
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('対象範囲内に該当データなし')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: /判定詳細/ }));
    await expect(
      await canvas.findByText('対象範囲内に該当データはありませんでした。')
    ).toBeVisible();
  },
};

// 航路登録は成功したが地物照会またはDID地区照会のいずれかが失敗（partial、App.tsx参照）。
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
    await expect(
      canvas.getByText('航路は登録できましたが、地物照会に失敗しました: HTTP 503: Service Unavailable')
    ).toBeVisible();
  },
};

export const ErrorState: Story = {
  args: {
    queryResult: {
      status: 'error',
      message: '航路登録に失敗しました: HTTP 500: Internal Server Error',
    } satisfies QueryResult,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('エラー')).toBeVisible();
    await expect(
      canvas.getByText('航路登録に失敗しました: HTTP 500: Internal Server Error')
    ).toBeVisible();
  },
};
