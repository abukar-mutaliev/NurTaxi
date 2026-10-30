import { Pressable, StyleSheet, View } from 'react-native';

import { brandColors, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from '@/shared/ui/glass-shadow';

const colors = {
  cardBg: brandColors.surface,
  cardBorder: brandColors.divider,
  shadow: brandColors.shadow,
  date: brandColors.textMuted,
  dropoff: brandColors.text,
  pickup: brandColors.textMuted,
  price: brandColors.text,
  rating: brandColors.primary,
} as const;

export interface TripHistoryCardProps {
  dateLabel: string;
  dropoffAddress: string;
  pickupAddress: string;
  priceLabel: string;
  ratingStars?: string | null;
  onPress: () => void;
}

export function TripHistoryCard({
  dateLabel,
  dropoffAddress,
  pickupAddress,
  priceLabel,
  ratingStars,
  onPress,
}: TripHistoryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.mainRow}>
        <View style={styles.leftColumn}>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text numberOfLines={1} style={styles.dropoff}>
            {dropoffAddress}
          </Text>
          <Text numberOfLines={1} style={styles.pickup}>
            {pickupAddress}
          </Text>
        </View>

        <View style={styles.rightColumn}>
          <Text style={styles.price}>{priceLabel}</Text>
          {ratingStars ? <Text style={styles.rating}>{ratingStars}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    minHeight: 104,
    paddingHorizontal: 19,
    paddingVertical: 17,
    ...glassShadow({ color: colors.shadow }),
  },
  date: {
    color: colors.date,
    fontSize: typeScale.xs,
  },
  dropoff: {
    color: colors.dropoff,
    fontSize: typeScale.md,
    fontWeight: '500',
    marginTop: 6,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickup: {
    color: colors.pickup,
    fontSize: typeScale.sm,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.92,
  },
  price: {
    color: colors.price,
    fontSize: typeScale.base,
    fontWeight: '600',
    textAlign: 'right',
  },
  rating: {
    color: colors.rating,
    fontSize: typeScale.xs,
    marginTop: 8,
    textAlign: 'right',
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 88,
  },
});
