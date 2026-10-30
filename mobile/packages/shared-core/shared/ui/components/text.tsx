import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { fontFamilyForWeight } from '../theme/fonts';
import { useTheme } from '../theme/theme-provider';
import type { TypographyToken } from '../theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TypographyToken;
  tone?: 'default' | 'muted' | 'inverse' | 'primary' | 'danger' | 'success';
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: TextProps) {
  const theme = useTheme();

  const color = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    inverse: theme.colors.textInverse,
    primary: theme.colors.primary,
    danger: theme.colors.danger,
    success: theme.colors.success,
  }[tone];

  /**
   * Жирность из варианта или переопределённая стилем превращается в начертание Manrope:
   * у кастомного шрифта Android сам жирность не подбирает (см. `fonts.ts`).
   */
  const weight = StyleSheet.flatten([theme.typography[variant], style])?.fontWeight;

  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant],
        { color, textAlign: align },
        style,
        { fontFamily: fontFamilyForWeight(weight), fontWeight: 'normal' },
      ]}
    />
  );
}
