import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { brandColors, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from './glass-shadow';
import { GLASS_COLORS } from './glass-theme';

export interface GlassListRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
}

export function GlassListRow({
  title,
  subtitle,
  onPress,
  onLongPress,
  right,
  destructive,
}: GlassListRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconOuter}>
        <View style={[styles.iconInner, destructive && styles.iconInnerDestructive]} />
      </View>
      <View style={styles.textBlock}>
        <Text numberOfLines={1} style={[styles.title, destructive && styles.destructiveTitle]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: GLASS_COLORS.chevron,
    fontSize: typeScale.base,
    lineHeight: 22,
  },
  destructiveTitle: {
    color: GLASS_COLORS.error,
  },
  iconInner: {
    backgroundColor: GLASS_COLORS.dot,
    borderRadius: radius.pill,
    height: 15,
    width: 15,
  },
  iconInnerDestructive: {
    backgroundColor: GLASS_COLORS.error,
  },
  iconOuter: {
    alignItems: 'center',
    backgroundColor: brandColors.secondarySoft,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    alignItems: 'center',
    backgroundColor: GLASS_COLORS.cardBg,
    borderColor: GLASS_COLORS.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    minHeight: 72,
    paddingHorizontal: 17,
    paddingVertical: 16,
    ...glassShadow({ color: GLASS_COLORS.shadow }),
  },
  subtitle: {
    color: GLASS_COLORS.subtitle,
    fontSize: typeScale.sm,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: GLASS_COLORS.title,
    fontSize: typeScale.base,
    fontWeight: '600',
  },
});
