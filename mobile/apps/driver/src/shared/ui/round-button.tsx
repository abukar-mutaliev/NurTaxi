import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

import { Chevron } from './chevron';

export interface RoundButtonProps {
  /** Готовая иконка-шеврон — предпочтительнее текстового символа. */
  icon?: 'back' | 'forward';
  /** Произвольный символ, если иконки не хватает. */
  glyph?: string;
  children?: ReactNode;
  size?: number;
  onPress?: () => void;
  accessibilityLabel: string;
  /** Заливка: белая «стеклянная» (по умолчанию) или брендовая. */
  variant?: 'surface' | 'primary' | 'accent';
  style?: StyleProp<ViewStyle>;
}

/** Круглая кнопка из макета: назад, меню, индикаторы на карте. */
export function RoundButton({
  icon,
  glyph,
  children,
  size = 44,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  style,
}: RoundButtonProps) {
  const theme = useTheme();

  const background = {
    surface: theme.colors.surface,
    primary: theme.colors.primary,
    accent: theme.colors.accent,
  }[variant];

  const foreground = variant === 'surface' ? theme.colors.primary : theme.colors.onPrimary;

  const content =
    children ??
    (icon ? (
      <Chevron
        color={foreground}
        direction={icon === 'back' ? 'left' : 'right'}
        size={size * 0.24}
        thickness={Math.max(2, size * 0.045)}
      />
    ) : (
      <Text style={{ color: foreground, fontSize: size * 0.42 }}>{glyph}</Text>
    ));

  const body = (
    <View
      style={[
        styles.circle,
        {
          backgroundColor: background,
          borderColor: variant === 'surface' ? theme.colors.border : 'transparent',
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
      ]}
    >
      {content}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    shadowColor: 'rgba(89,71,31,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});
