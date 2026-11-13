import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { shadows } from '../theme/elevation';
import { useTheme } from '../theme/theme-provider';

export interface CardProps {
  children: ReactNode;
  tone?: 'surface' | 'muted' | 'danger' | 'success' | 'warning';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, tone = 'surface', style }: CardProps) {
  const theme = useTheme();

  const backgroundColor = {
    surface: theme.colors.surface,
    muted: theme.colors.surfaceMuted,
    danger: theme.colors.dangerSurface,
    success: theme.colors.successSurface,
    warning: theme.colors.warningSurface,
  }[tone];

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: theme.radius.lg,
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
        },
        // Белая карточка парит над фоном; цветные подложки — плоские.
        tone === 'surface' ? shadows.md : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
