import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import MapContainer from './MapContainer';

const meta = {
  component: MapContainer,
  tags: ['ai-generated'],
  decorators: [
    (Story) => (
      <div className="h-[640px] w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    buildingFeatures: [],
    prohibitedAreas: [],
    groundFeaturesByLayer: { road: [], landslide: [], flood: [], landuse: [] },
    layerVisibility: { road: true, landslide: true, flood: true, landuse: false },
  },
} satisfies Meta<typeof MapContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

// 地図右上の凡例カードは初期状態では薄い見出し行だけに畳み、クリックで従来の
// 内容を同じ幅のカード内に展開する。MapLibreの描画とは独立して開閉できることを確認する。
export const CollapsibleLegend: Story = {
  play: async ({ canvas, userEvent }) => {
    const legendButton = canvas.getByRole('button', { name: '凡例' });
    await expect(legendButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(legendButton);
    await expect(legendButton).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText('航路への影響')).toBeVisible();

    await userEvent.click(legendButton);
    await expect(legendButton).toHaveAttribute('aria-expanded', 'false');
  },
};
