import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import CollapsibleSidebar from './CollapsibleSidebar';
import SettingsPanel from './SettingsPanel';

const meta = {
  component: CollapsibleSidebar,
  decorators: [
    (Story) => (
      <div className="flex h-[640px] w-full overflow-hidden bg-bg-app">
        <Story />
        <div className="flex-1 bg-[linear-gradient(135deg,#e8f3fa_25%,#f8fbfd_25%,#f8fbfd_50%,#e8f3fa_50%,#e8f3fa_75%,#f8fbfd_75%)] bg-[length:24px_24px] p-6 text-sm text-text-secondary">
          地図領域（ペインを閉じても常に表示）
        </div>
      </div>
    ),
  ],
  args: {
    children: (
      <div className="h-full border-r border-brand-blue-light/20 bg-bg-panel p-5">
        <h2 className="text-base font-semibold text-text-primary">フィルタ</h2>
        <p className="mt-2 text-sm text-text-secondary">左ペインの内容</p>
      </div>
    ),
  },
} satisfies Meta<typeof CollapsibleSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToggleHandle: Story = {
  play: async ({ canvas, userEvent }) => {
    const closeButton = canvas.getByRole('button', { name: '左ペインを閉じる' });
    await expect(closeButton).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(closeButton);
    const openButton = canvas.getByRole('button', { name: '左ペインを開く' });
    await expect(openButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(openButton);
    await expect(canvas.getByRole('button', { name: '左ペインを閉じる' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  },
};

// 実アプリと同じ設定フォームを入れた、左フィルタペイン確認用のストーリー。
export const FilterPanel: Story = {
  args: {
    children: (
      <SettingsPanel
        connection={{ connected: true, state: 'connected', mock: false, baseUrl: 'http://localhost:8001' }}
        startLat={35.975841}
        setStartLat={fn()}
        startLon={139.065854}
        setStartLon={fn()}
        endLat={35.98839}
        setEndLat={fn()}
        endLon={139.046579}
        setEndLon={fn()}
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
        onQuery={fn()}
        isLoading={false}
      />
    ),
  },
};
