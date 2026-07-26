import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '../theme/theme-provider';
import { MIN_TOUCH_SIZE } from '../theme/tokens';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = true,
  disabled,
  left,
  right,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = Boolean(disabled) || loading;

  const background: Record<ButtonVariant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.surfaceMuted,
    ghost: 'transparent',
    danger: theme.colors.danger,
  };
  const foreground: Record<ButtonVariant, string> = {
    primary: theme.colors.onPrimary,
    secondary: theme.colors.text,
    ghost: theme.colors.primary,
    danger: theme.colors.textInverse,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background[variant],
          borderRadius: theme.radius.md,
          minHeight: size === 'lg' ? 52 : MIN_TOUCH_SIZE,
          paddingHorizontal: theme.spacing.lg,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: theme.colors.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={foreground[variant]} />
      ) : (
        <View style={styles.content}>
          {left}
          <Text variant="bodyStrong" style={{ color: foreground[variant] }}>
            {title}
          </Text>
          {right}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
