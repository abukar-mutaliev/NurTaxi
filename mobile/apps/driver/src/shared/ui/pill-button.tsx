import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const c = {
  primaryBg: '#472451',
  primaryPressed: '#33193A',
  primaryText: '#F7F3EE',
  surfaceBg: '#FFFFFF',
  surfaceBorder: '#F0E7DC',
  surfaceText: '#2E2331',
  shadow: 'rgba(89,71,31,0.10)',
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
 * Кнопка-«пилюля» из макета.
 *
 * Заливка сплошная, а не градиентная: градиент в макете почти неразличим на кнопке,
 * а нативный `expo-linear-gradient` требует пересборки dev-клиента. Цвет взят средним
 * между крайними точками градиента макета (#5A2E60 → #3A1D3F).
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary ? (pressed ? c.primaryPressed : c.primaryBg) : c.surfaceBg,
          borderColor: isPrimary ? 'transparent' : c.surfaceBorder,
          borderRadius: height / 2,
          borderWidth: isPrimary ? 0 : 1,
          height,
          opacity: isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? c.primaryText : c.surfaceText} />
      ) : (
        <Text style={[styles.label, { color: isPrimary ? c.primaryText : c.surfaceText }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
