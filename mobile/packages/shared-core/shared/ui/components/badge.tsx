import { View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Text } from './text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

/** Компактный статус: этап заказа, статус верификации, статус выплаты. */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  const { backgroundColor, color } = {
    neutral: { backgroundColor: theme.colors.surfaceMuted, color: theme.colors.text },
    primary: { backgroundColor: theme.colors.primary, color: theme.colors.onPrimary },
    success: { backgroundColor: theme.colors.successSurface, color: theme.colors.success },
    warning: { backgroundColor: theme.colors.warningSurface, color: theme.colors.warning },
    danger: { backgroundColor: theme.colors.dangerSurface, color: theme.colors.danger },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
      }}
    >
      <Text style={{ color }} variant="label">
        {label}
      </Text>
    </View>
  );
}
