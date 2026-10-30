/**
 * Цвета клиентских экранов. Названия остались от «стеклянного» стиля, значения — токены
 * палитры «Слива и пудра» (`brandColors`): плоские поверхности вместо полупрозрачного
 * стекла, без золота и двухцветных градиентов.
 */
import { brandColors } from '@nurtaxi/shared-core/shared/ui';

export const GLASS_COLORS = {
  background: brandColors.background,
  brand: brandColors.primary,
  title: brandColors.text,
  subtitle: brandColors.textMuted,
  hint: brandColors.textMuted,
  cardBg: brandColors.surface,
  cardBorder: brandColors.divider,
  cardBorderSelected: brandColors.primary,
  shadow: brandColors.shadow,
  inputBg: brandColors.surface,
  inputBorder: brandColors.border,
  inputText: brandColors.text,
  inputPlaceholder: brandColors.textMuted,
  dot: brandColors.secondary,
  // Градиент кнопки свёлся к одному цвету: начало и конец совпадают.
  buttonStart: brandColors.primary,
  buttonEnd: brandColors.primary,
  buttonText: brandColors.onPrimary,
  buttonShadow: brandColors.shadow,
  error: brandColors.danger,
  success: brandColors.primary,
  warningBg: brandColors.secondarySubtle,
  warningBorder: brandColors.secondary,
  chevron: brandColors.icon,
  switchActive: brandColors.primary,
} as const;

export const GLASS_DESIGN_WIDTH = 390;
