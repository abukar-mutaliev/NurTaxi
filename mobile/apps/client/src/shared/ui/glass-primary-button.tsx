import { Pressable, StyleSheet } from 'react-native';

import {
  controlColors,
  radius,
  shadows,
  Text,
  typeScale,
  type ControlVariant,
} from '@nurtaxi/shared-core/shared/ui';

export interface GlassPrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingTitle?: string;
  scale?: number;
  variant?: 'primary' | 'secondary' | 'destructive';
}

const VARIANT: Record<NonNullable<GlassPrimaryButtonProps['variant']>, ControlVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'danger',
};

/**
 * Основная кнопка клиентских экранов. Плоская заливка вместо двухцветного градиента;
 * нажатое и неактивное состояния — цвета палитры (`controlColors`), а не прозрачность.
 */
export function GlassPrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingTitle,
  scale = 1,
  variant = 'primary',
}: GlassPrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const label = loading ? (loadingTitle ?? title) : title;
  const colors = controlColors[VARIANT[variant]];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && !isDisabled ? shadows.sm : null,
        {
          backgroundColor: isDisabled
            ? colors.disabled
            : pressed
              ? colors.pressed
              : colors.background,
          borderRadius: scale * radius.xxl,
          height: scale * (variant === 'secondary' ? 52 : 58),
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: isDisabled ? colors.disabledText : colors.text,
            fontSize: scale * typeScale.base,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
