import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import type { SavedAddressLabelKind } from './saved-address-label';
import { SavedAddressIcon } from './saved-address-icon';

const colors = {
  cardBg: 'rgba(255,255,255,0.82)',
  cardBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  title: '#2E2331',
  subtitle: '#7A6E78',
  star: '#C99A54',
  chevron: '#A99FA6',
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  chevron: {
    color: colors.chevron,
    fontSize: 17,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.92,
  },
  star: {
    color: colors.star,
    fontSize: 15,
    lineHeight: 22,
  },
  subtitle: {
    color: colors.subtitle,
    fontSize: 13,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.title,
    fontSize: 15,
    fontWeight: '600',
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
