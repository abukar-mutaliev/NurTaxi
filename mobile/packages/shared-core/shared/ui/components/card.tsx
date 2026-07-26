import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

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
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          borderWidth: tone === 'surface' ? 1 : 0,
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
