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

export function GlassCard({ children, style, tone = 'default' }: GlassCardProps) {
  const borderColor =
    tone === 'selected'
      ? GLASS_COLORS.cardBorderSelected
      : tone === 'warning'
        ? GLASS_COLORS.warningBorder
        : GLASS_COLORS.cardBorder;

  const backgroundColor = tone === 'warning' ? GLASS_COLORS.warningBg : GLASS_COLORS.cardBg;

  return <View style={[styles.card, { backgroundColor, borderColor }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...glassShadow({ color: GLASS_COLORS.shadow }),
  },
});
