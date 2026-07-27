import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

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
    fontSize: 17,
    lineHeight: 22,
  },
  destructiveTitle: {
    color: GLASS_COLORS.error,
  },
  iconInner: {
    backgroundColor: GLASS_COLORS.dot,
    borderRadius: 999,
    height: 15,
    width: 15,
  },
  iconInnerDestructive: {
    backgroundColor: GLASS_COLORS.error,
  },
  iconOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(252,244,228,0.95)',
    borderRadius: 999,
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
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    minHeight: 72,
    paddingHorizontal: 17,
    paddingVertical: 16,
    shadowColor: GLASS_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  subtitle: {
    color: GLASS_COLORS.subtitle,
    fontSize: 13,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: GLASS_COLORS.title,
    fontSize: 15,
    fontWeight: '600',
  },
});
