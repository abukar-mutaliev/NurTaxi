import { Pressable, StyleSheet, View } from 'react-native';

import { brandColors, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from '@/shared/ui/glass-shadow';

const colors = {
  cardBg: brandColors.surface,
  cardBorder: brandColors.divider,
  shadow: brandColors.shadow,
  title: brandColors.text,
  subtitle: brandColors.textMuted,
  chevron: brandColors.textMuted,
  iconOuterDefault: brandColors.secondarySoft,
  iconInnerDefault: brandColors.primary,
  iconOuterSafety: brandColors.primarySoft,
  iconInnerSafety: brandColors.primary,
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
          style={[
            styles.iconInner,
            { backgroundColor: active ? brandColors.danger : iconColors.inner },
          ]}
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
    fontSize: typeScale.base,
    lineHeight: 22,
  },
  iconInner: {
    borderRadius: radius.pill,
    height: 15,
    width: 15,
  },
  iconOuter: {
    alignItems: 'center',
    borderRadius: radius.pill,
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
    borderColor: brandColors.dangerSoft,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    minHeight: 84,
    paddingHorizontal: 17,
    paddingVertical: 20,
    ...glassShadow({ color: colors.shadow }),
  },
  subtitle: {
    color: colors.subtitle,
    fontSize: typeScale.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.title,
    fontSize: typeScale.md,
    fontWeight: '600',
  },
});
