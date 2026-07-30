import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

import { Chevron } from './chevron';

export interface MenuCardProps {
  title: string;
  subtitle?: string;
  /** Цвет круглой иконки-точки слева. По умолчанию — брендовый фиолетовый. */
  dotTone?: 'primary' | 'accent';
  onPress?: () => void;
}

/** Пункт меню профиля из макета: белая карточка, круглая иконка-точка и шеврон. */
export function MenuCard({ title, subtitle, dotTone = 'primary', onPress }: MenuCardProps) {
  const theme = useTheme();

  const dotBg = dotTone === 'accent' ? 'rgba(232,197,143,0.28)' : 'rgba(58,29,63,0.10)';
  const dotColor = dotTone === 'accent' ? theme.colors.accent : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          gap: theme.spacing.md,
          opacity: pressed ? 0.9 : 1,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
      ]}
    >
      <View style={[styles.dotWrap, { backgroundColor: dotBg, borderRadius: 999 }]}>
        <View style={{ backgroundColor: dotColor, borderRadius: 999, height: 10, width: 10 }} />
      </View>

      <View style={styles.body}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text tone="muted" variant="caption">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onPress ? <Chevron color={theme.colors.textMuted} direction="right" size={9} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 1,
  },
  card: {
    alignItems: 'center',
    borderWidth: 1,
    elevation: 1,
    flexDirection: 'row',
    shadowColor: 'rgba(89,71,31,0.07)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  dotWrap: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
});
