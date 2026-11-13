/**
 * Тени Nur Taxi. Карточки без рамок «парят» над фоном, поэтому тень здесь — главное, что
 * отделяет поверхность: мягкая, из цвета текста палитры, без цветных ореолов.
 *
 * Android-`elevation` для этого не годится: цвет с прозрачностью 8% она умножает на свою и
 * тень почти не видна — карточки держались только на рамках. `boxShadow` рисует одинаково на
 * Android, iOS и в вебе. На Android он работает с API 28, ниже остаётся `elevation`.
 */
import { Platform, type ViewStyle } from 'react-native';

import { brandPalette, withAlpha } from './brand';

const ink = (alpha: number) => withAlpha(brandPalette.text, alpha);

function shadow(boxShadow: string, legacyElevation: number): ViewStyle {
  if (Platform.OS === 'android' && Platform.Version < 28) {
    return { elevation: legacyElevation };
  }
  return { boxShadow };
}

export const shadows = {
  /** Кнопки, поля, мелкие плашки. */
  sm: shadow(`0px 2px 8px ${ink(0.08)}`, 2),
  /** Карточки и списки. */
  md: shadow(`0px 8px 24px ${ink(0.08)}, 0px 1px 3px ${ink(0.04)}`, 4),
  /** Всплывающее поверх всего: диалоги, таббар, предложения заказа. */
  lg: shadow(`0px 16px 40px ${ink(0.16)}, 0px 2px 8px ${ink(0.06)}`, 8),
  /** Нижние шторки и панели — тень уходит вверх. */
  up: shadow(`0px -8px 28px ${ink(0.1)}`, 8),
} as const;

export type ShadowToken = keyof typeof shadows;
