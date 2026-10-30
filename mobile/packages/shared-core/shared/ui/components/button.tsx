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

import { controlColors } from '../theme/brand';
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
  // Состояния — цвета палитры, а не прозрачность (`controlColors`).
  const colors = controlColors[variant];
  const foreground = isDisabled && !loading ? colors.disabledText : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isDisabled
            ? colors.disabled
            : pressed
              ? colors.pressed
              : colors.background,
          borderRadius: theme.radius.pill,
          minHeight: size === 'lg' ? 52 : MIN_TOUCH_SIZE,
          paddingHorizontal: theme.spacing.xl,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: theme.colors.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          {left}
          <Text variant="bodyStrong" style={{ color: foreground }}>
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
