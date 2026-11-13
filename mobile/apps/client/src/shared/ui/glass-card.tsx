import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { glassShadow } from './glass-shadow';
import { GLASS_COLORS } from './glass-theme';
import { radius } from '@nurtaxi/shared-core/shared/ui';

export interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'default' | 'warning' | 'selected';
}

/** Карточка без рамки: парит над фоном на тени, а состояние передаёт цвет заливки. */
export function GlassCard({ children, style, tone = 'default' }: GlassCardProps) {
  const backgroundColor =
    tone === 'selected'
      ? GLASS_COLORS.cardBgSelected
      : tone === 'warning'
        ? GLASS_COLORS.warningBg
        : GLASS_COLORS.cardBg;

  return <View style={[styles.card, { backgroundColor }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...glassShadow({ color: GLASS_COLORS.shadow }),
  },
});
