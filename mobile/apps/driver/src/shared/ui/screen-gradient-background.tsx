import { StyleSheet, View } from 'react-native';

import { brandColors } from '@nurtaxi/shared-core/shared/ui';

export type GradientTone = 'gold' | 'rose';

/**
 * Фон экранов Нур: `gold` — приветствие и вход, `rose` — код, верификация, профиль.
 *
 * Прежние градиенты (PNG 8×1200) заменены ровными цветами палитры: молочный фон и едва
 * заметная пудра для второго тона — без многоцветных переходов.
 *
 * `pointerEvents="none"` — фон не перехватывает касания на участках без содержимого.
 */
const BACKGROUND: Record<GradientTone, string> = {
  gold: brandColors.background,
  rose: brandColors.secondarySubtle,
};

export function ScreenGradientBackground({ tone = 'gold' }: { tone?: GradientTone }) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: BACKGROUND[tone] }]}
    />
  );
}
