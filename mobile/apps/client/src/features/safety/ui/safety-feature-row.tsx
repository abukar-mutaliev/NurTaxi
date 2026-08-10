import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  cardBg: 'rgba(255,255,255,0.82)',
  cardBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  title: '#2E2331',
  subtitle: '#7A6E78',
  chevron: '#A99FA6',
  iconOuterDefault: 'rgba(252,244,228,0.95)',
  iconInnerDefault: '#E8C882',
  iconOuterSafety: 'rgba(231,238,227,0.95)',
  iconInnerSafety: '#6B9B6E',
} as const;

export type SafetyFeatureIconTone = 'default' | 'safety';

const iconToneColors: Record<SafetyFeatureIconTone, { outer: string; inner: string }> = {
  default: { outer: colors.iconOuterDefault, inner: colors.iconInnerDefault },
  safety: { outer: colors.iconOuterSafety, inner: colors.iconInnerSafety },
};

export interface SafetyFeatureRowProps {
  title: string;
  subtitle: string;
  iconTone?: SafetyFeatureIconTone;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function SafetyFeatureRow({
  title,
  subtitle,
  iconTone = 'default',
  active = false,
  loading = false,
  disabled = false,
  onPress,
}: SafetyFeatureRowProps) {
  const iconColors = iconToneColors[iconTone];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        (pressed || loading) && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.iconOuter, { backgroundColor: iconColors.outer }]}>
        <View
          style={[styles.iconInner, { backgroundColor: active ? '#E85D4A' : iconColors.inner }]}
        />
      </View>
      <View style={styles.textBlock}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: colors.chevron,
    fontSize: 17,
    lineHeight: 22,
  },
  iconInner: {
    borderRadius: 999,
    height: 15,
    width: 15,
  },
  iconOuter: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.72,
  },
  rowActive: {
    borderColor: 'rgba(232,93,74,0.35)',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    minHeight: 84,
    paddingHorizontal: 17,
    paddingVertical: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  subtitle: {
    color: colors.subtitle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.title,
    fontSize: 14,
    fontWeight: '600',
  },
});
