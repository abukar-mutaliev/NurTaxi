import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { brandColors, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from '@/shared/ui/glass-shadow';

import type { SavedAddressLabelKind } from './saved-address-label';
import { SavedAddressIcon } from './saved-address-icon';

const colors = {
  cardBg: brandColors.surface,
  cardBorder: brandColors.divider,
  shadow: brandColors.shadow,
  title: brandColors.text,
  subtitle: brandColors.textMuted,
  star: brandColors.primary,
  chevron: brandColors.textMuted,
} as const;

export interface SavedAddressCardProps {
  label: string;
  address: string;
  iconKind?: SavedAddressLabelKind;
  isPrimary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function SavedAddressCard({
  label,
  address,
  iconKind = 'custom',
  isPrimary = false,
  loading = false,
  disabled = false,
  onPress,
  onLongPress,
}: SavedAddressCardProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      collapsable={false}
      disabled={isDisabled}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && !isDisabled && styles.pressed]}
    >
      <SavedAddressIcon kind={iconKind} />

      <View style={styles.textBlock}>
        <Text numberOfLines={1} style={styles.title}>
          {label}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {address}
        </Text>
      </View>

      <View style={styles.trailing}>
        {isPrimary ? <Text style={styles.star}>★</Text> : null}
        {loading ? (
          <ActivityIndicator color={colors.chevron} size="small" />
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    minHeight: 84,
    paddingHorizontal: 19,
    paddingVertical: 20,
    ...glassShadow({ color: colors.shadow }),
  },
  chevron: {
    color: colors.chevron,
    fontSize: typeScale.base,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.92,
  },
  star: {
    color: colors.star,
    fontSize: typeScale.base,
    lineHeight: 22,
  },
  subtitle: {
    color: colors.subtitle,
    fontSize: typeScale.sm,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.title,
    fontSize: typeScale.base,
    fontWeight: '600',
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
