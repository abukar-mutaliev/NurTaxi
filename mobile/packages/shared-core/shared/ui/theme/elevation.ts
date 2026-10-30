/**
 * Тени Nur Taxi — спокойные, из цвета текста палитры, без цветных ореолов.
 * Четыре уровня вместо десятка разрозненных `shadow*` по экранам.
 */
import { Platform, type ViewStyle } from 'react-native';

import { brandColors } from './brand';

type ShadowStyle = ViewStyle & { boxShadow?: string };

function shadow(offsetY: number, blur: number, color: string, elevation: number): ShadowStyle {
  // React Native Web отклоняет `shadow*` в пользу `boxShadow`.
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${offsetY}px ${blur}px ${color}` };
  }
  return {
    elevation,
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: 1,
    shadowRadius: blur,
  };
}

export const shadows = {
  /** Кнопки, поля, мелкие плашки. */
  sm: shadow(2, 8, brandColors.shadow, 2),
  /** Карточки и списки. */
  md: shadow(6, 16, brandColors.shadow, 4),
  /** Всплывающее поверх всего: диалоги, предложения заказа. */
  lg: shadow(12, 28, brandColors.shadowStrong, 8),
  /** Нижние шторки и панели — тень уходит вверх. */
  up: shadow(-6, 20, brandColors.shadow, 8),
} as const;

export type ShadowToken = keyof typeof shadows;
