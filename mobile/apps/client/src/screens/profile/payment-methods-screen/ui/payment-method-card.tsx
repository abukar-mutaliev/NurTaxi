import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

export type PaymentCardBrand = 'visa' | 'mastercard';

const colors = {
  cardBg: 'rgba(255,255,255,0.82)',
  cardBorder: 'rgba(255,255,255,0.9)',
  cardBorderPrimary: 'rgba(201,154,84,0.5)',
  shadow: 'rgba(89,71,31,0.06)',
  title: '#2E2331',
  subtitle: '#7A6E78',
  visaBg: 'rgba(26,31,113,0.1)',
  visaText: '#1A1F71',
  mastercardBg: 'rgba(235,0,27,0.1)',
  mastercardText: '#EB001B',
  radioOuter: 'rgba(231,238,227,0.95)',
  radioInner: '#6B9B6E',
} as const;

const brandStyles: Record<
  PaymentCardBrand,
  { badgeBg: string; badgeText: string; badgeLabel: string; fontSize: number }
> = {
  visa: {
    badgeBg: colors.visaBg,
    badgeText: colors.visaText,
    badgeLabel: 'VISA',
    fontSize: 10,
  },
  mastercard: {
    badgeBg: colors.mastercardBg,
    badgeText: colors.mastercardText,
    badgeLabel: 'MC',
    fontSize: 11,
  },
};

export interface PaymentMethodCardProps {
  brand: PaymentCardBrand;
  title: string;
  subtitle?: string;
  isPrimary?: boolean;
  editMode?: boolean;
  deleteDisabled?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}

export function PaymentMethodCard({
  brand,
  title,
  subtitle,
  isPrimary = false,
  editMode = false,
  deleteDisabled = false,
  onPress,
  onDelete,
}: PaymentMethodCardProps) {
  const brandStyle = brandStyles[brand];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isPrimary }}
      disabled={editMode}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isPrimary && !editMode ? styles.cardPrimary : null,
        pressed && !editMode && styles.pressed,
      ]}
    >
      <View style={[styles.badge, { backgroundColor: brandStyle.badgeBg }]}>
        <Text
          style={[
            styles.badgeText,
            {
              color: brandStyle.badgeText,
              fontSize: brandStyle.fontSize,
            },
          ]}
        >
          {brandStyle.badgeLabel}
        </Text>
      </View>

      <View style={styles.textBlock}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {editMode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: deleteDisabled }}
          disabled={deleteDisabled}
          hitSlop={8}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            deleteDisabled && styles.deleteButtonDisabled,
            pressed && !deleteDisabled && styles.pressed,
          ]}
        >
          <Text style={styles.deleteIcon}>−</Text>
        </Pressable>
      ) : (
        <View style={[styles.radioOuter, !isPrimary && styles.radioOuterEmpty]}>
          {isPrimary ? <View style={styles.radioInner} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 46,
  },
  badgeText: {
    fontWeight: '700',
    textAlign: 'center',
  },
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
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  cardPrimary: {
    borderColor: colors.cardBorderPrimary,
    borderWidth: 1.5,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#E85D4A',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  deleteButtonDisabled: {
    backgroundColor: 'rgba(232,93,74,0.35)',
  },
  deleteIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: -1,
  },
  pressed: {
    opacity: 0.92,
  },
  radioInner: {
    backgroundColor: colors.radioInner,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  radioOuter: {
    alignItems: 'center',
    backgroundColor: colors.radioOuter,
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  radioOuterEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(169,159,166,0.55)',
    borderWidth: 1.5,
  },
  subtitle: {
    color: colors.subtitle,
    fontSize: 12,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.title,
    fontSize: 15,
    fontWeight: '500',
  },
});
