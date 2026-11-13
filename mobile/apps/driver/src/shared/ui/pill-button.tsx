import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  brandColors,
  controlColors,
  shadows,
  Text,
  typeScale,
} from '@nurtaxi/shared-core/shared/ui';

const variantColors = {
  gradient: controlColors.primary,
  surface: {
    background: brandColors.surface,
    pressed: brandColors.secondarySubtle,
    disabled: brandColors.surfaceMuted,
    text: brandColors.text,
    disabledText: brandColors.textMuted,
  },
  soft: controlColors.secondary,
} as const;

export type PillButtonVariant = keyof typeof variantColors;

export interface PillButtonProps {
  title: string;
  onPress?: () => void;
  /**
   * `gradient` — основное действие, `surface` — второстепенное на фоне экрана (белая кнопка),
   * `soft` — второстепенное на белой карточке: белая кнопка на белом сливалась бы с ней.
   */
  variant?: PillButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Кнопка-«пилюля»: сплошная заливка основным цветом или белая второстепенная.
 * Нажатое и неактивное состояния — цвета палитры, а не прозрачность.
 */
export function PillButton({
  title,
  onPress,
  variant = 'gradient',
  disabled = false,
  loading = false,
  height = 58,
  style,
}: PillButtonProps) {
  const isDisabled = disabled || loading;
  const colors = variantColors[variant];
  const textColor = isDisabled && !loading ? colors.disabledText : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant !== 'soft' && styles.raised,
        {
          backgroundColor: isDisabled
            ? colors.disabled
            : pressed
              ? colors.pressed
              : colors.background,
          borderRadius: height / 2,
          height,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typeScale.base,
    fontWeight: '600',
  },
  raised: {
    ...shadows.sm,
  },
});
