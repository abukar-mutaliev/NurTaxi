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

const primary = controlColors.primary;
const surface = {
  background: brandColors.surface,
  pressed: brandColors.secondarySubtle,
  disabled: brandColors.surfaceMuted,
  border: brandColors.border,
  text: brandColors.text,
  disabledText: brandColors.textMuted,
} as const;

export type PillButtonVariant = 'gradient' | 'surface';

export interface PillButtonProps {
  title: string;
  onPress?: () => void;
  /** `gradient` — основное действие, `surface` — второстепенное (белая кнопка). */
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
  const isPrimary = variant === 'gradient';
  const colors = isPrimary ? primary : surface;
  const textColor = isDisabled && !loading ? colors.disabledText : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isDisabled
            ? colors.disabled
            : pressed
              ? colors.pressed
              : colors.background,
          borderColor: isPrimary ? 'transparent' : surface.border,
          borderRadius: height / 2,
          borderWidth: isPrimary ? 0 : 1,
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
    ...shadows.sm,
  },
  label: {
    fontSize: typeScale.base,
    fontWeight: '600',
  },
});
