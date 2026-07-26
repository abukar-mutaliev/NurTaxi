import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { MIN_TOUCH_SIZE } from '../theme/tokens';
import { Text } from './text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function ListItem({
  title,
  subtitle,
  left,
  right,
  onPress,
  destructive = false,
  disabled = false,
}: ListItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
          gap: theme.spacing.md,
          minHeight: MIN_TOUCH_SIZE + 8,
          opacity: disabled ? 0.5 : 1,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
      ]}
    >
      {left}
      <View style={styles.body}>
        <Text tone={destructive ? 'danger' : 'default'} variant="body">
          {title}
        </Text>
        {subtitle ? (
          <Text tone="muted" variant="caption">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Divider() {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth }} />
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 2,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
