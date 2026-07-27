/** Figma node 5:36 — floating glass tab bar. */
export const GLASS_TAB_BAR_HEIGHT = 80;
export const GLASS_TAB_BAR_MARGIN = 12;

export function getGlassTabBarBottomInset(safeAreaBottom: number): number {
  return GLASS_TAB_BAR_HEIGHT + GLASS_TAB_BAR_MARGIN + Math.max(safeAreaBottom, 8);
}
