import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import SettingsPanel from './SettingsPanel';
import type { ConnectionStatus } from '../api/client';

const noop = fn();

const meta = {
  component: SettingsPanel,
  tags: ['ai-generated'],
  args: {
    // App.tsxの初期値（秩父市周辺）と揃える。
    startLat: 35.975841,
    startLon: 139.065854,
    endLat: 35.98839,
    endLon: 139.046579,
    aglM: 100,
    showRoute: true,
    showBuildings: true,
    showProhibitedAreas: true,
    showRoad: true,
    showLandslide: true,
    showFlood: true,
    showLanduse: false,
    isLoading: false,
    connection: null,
    setStartLat: noop,
    setStartLon: noop,
    setEndLat: noop,
    setEndLon: noop,
    setAglM: noop,
    setShowRoute: noop,
    setShowBuildings: noop,
    setShowProhibitedAreas: noop,
    setShowRoad: noop,
    setShowLandslide: noop,
    setShowFlood: noop,
    setShowLanduse: noop,
    onQuery: noop,
  },
} satisfies Meta<typeof SettingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// connection=null: 起動直後、接続確認中の状態。
export const ConnectionChecking: Story = {};

const connectedStatus: ConnectionStatus = {
  connected: true,
  state: 'connected',
  mock: false,
  baseUrl: 'https://airway-digitaltwin-db.onrender.com',
};

export const Connected: Story = {
  args: { connection: connectedStatus },
  play: async ({ canvas }) => {
    // baseUrlはconnection propの値がそのまま表示される（接続先の切り分けに使う項目）。
    await expect(canvas.getByText(connectedStatus.baseUrl!)).toBeVisible();
  },
};

const mockStatus: ConnectionStatus = {
  connected: true,
  state: 'connected',
  mock: true,
  baseUrl: 'http://localhost:8001',
};

export const MockMode: Story = {
  args: { connection: mockStatus },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('モックモード')).toBeVisible();
    await expect(
      canvas.getByText('BFFがモックで応答しています（実APIには未接続）')
    ).toBeVisible();
  },
};

const errorStatus: ConnectionStatus = {
  connected: false,
  state: 'error',
  mock: false,
  baseUrl: 'http://localhost:8001',
  message: 'BFFがHTTP 502を返しました',
};

export const ConnectionError: Story = {
  args: { connection: errorStatus },
  play: async ({ canvas }) => {
    // detailはmessageとbaseUrlを' / 'で連結して出す（api/client.ts describeConnection）。
    await expect(
      canvas.getByText(`${errorStatus.message} / ${errorStatus.baseUrl}`)
    ).toBeVisible();
  },
};

// aglM >= 150で、個別許可が必要である旨の警告文言に切り替わる（航空法150m上限）。
export const HighAltitudeWarning: Story = {
  args: { aglM: 200 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('150m以上：原則不可。飛行には個別許可が必要')
    ).toBeVisible();
  },
};

// 実行中はボタンが disabled になり文言も「実行中…」に変わる。
export const Loading: Story = {
  args: { isLoading: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: '実行中…' });
    await expect(button).toBeDisabled();
  },
};

// ボタン押下でonQueryが呼ばれることの確認（isLoadingがfalseのときのみ有効）。
export const QueryButtonInteraction: Story = {
  args: { onQuery: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '航路を登録して周辺データを照会' }));
    await expect(args.onQuery).toHaveBeenCalledTimes(1);
  },
};

// クエリボタンはbg-action-primary（#0F6FC6）。Tailwindの共有previewが実際に
// カスタムカラーを読み込んでいることの唯一の裏付け（プロジェクト全体でこの
// CssCheckは1件のみ）。
export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: '航路を登録して周辺データを照会' });
    await expect(getComputedStyle(button).backgroundColor).toBe('rgb(15, 111, 198)');
  },
};

// レイヤ全体は初期状態で畳み、航路を含む選択項目は見せない。カテゴリも個別に
// 展開してからチェックボックスを操作する。
export const NestedLayers: Story = {
  play: async ({ canvas, userEvent }) => {
    const layers = canvas.getByRole('button', { name: 'レイヤ' });
    await expect(layers).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByText('航路')).toBeNull();

    await userEvent.click(layers);
    await expect(layers).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText('航路')).toBeVisible();

    const impact = canvas.getByRole('button', { name: '航路への影響' });
    await expect(impact).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(impact);
    await expect(canvas.getByRole('checkbox', { name: /建物/ })).toBeVisible();
  },
};
