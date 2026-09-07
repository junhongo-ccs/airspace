import type { GroundFeature, GroundFeatureGroup } from '../api/client';

// BFF が返す layer 値の表示名。viewer/src/plateau_route_judgment.py と対応。
export const LAYER_LABELS: Record<string, string> = {
  building: '建物',
  road: '道路',
  landslide: '土砂災害',
  flood: '洪水浸水',
  landuse: '土地利用',
};

// 6-13: 結果画面も地図凡例と同じ「航路への影響」/「航路活用の可能性」で区分する。
// 災害リスク区域（土砂災害・洪水浸水）を、航路を妨げる障害物や飛行禁止区域と
// 同じ意味で誤認させないための区分（改善タスク§2・6-13）。
export const GROUP_LABELS: Record<GroundFeatureGroup, string> = {
  impact: '航路への影響',
  opportunity: '航路活用の可能性',
  landuse: '土地利用（影響/活用は分類による）',
};
export const GROUP_ORDER: GroundFeatureGroup[] = ['impact', 'opportunity', 'landuse'];

export function buildingHeightSummary(features: GroundFeature[]) {
  const buildings = features.filter((feature) => feature.layer === 'building');
  if (buildings.length === 0) return null;

  const clear = buildings.filter((feature) => feature.intersect.startsWith('交差なし（高さ方向')).length;
  const needsReview = buildings.filter((feature) => feature.intersect.startsWith('要確認（高さ方向')).length;
  const unverified = buildings.length - clear - needsReview;
  const parts = [
    clear > 0 && `クリア ${clear}件`,
    needsReview > 0 && `要確認 ${needsReview}件`,
    unverified > 0 && `未検証 ${unverified}件`,
  ].filter(Boolean);

  return `建物の高さ方向：${parts.join(' / ')}`;
}
