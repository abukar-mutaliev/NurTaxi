/** Плавающий нижний таб-бар (тот же макет, что в приложении клиента). */
export const GLASS_TAB_BAR_HEIGHT = 80;
export const GLASS_TAB_BAR_MARGIN = 12;

/**
 * Отступ снизу для содержимого экрана: таб-бар «висит» поверх контента,
 * поэтому нижний край списка/карточки нужно поднять на его высоту.
 */
export function getGlassTabBarBottomInset(safeAreaBottom: number): number {
  return GLASS_TAB_BAR_HEIGHT + GLASS_TAB_BAR_MARGIN + Math.max(safeAreaBottom, 8);
}
