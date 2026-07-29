import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  cardBg: 'rgba(255,255,255,0.82)',
  cardBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  date: '#A99FA6',
  dropoff: '#2E2331',
  pickup: '#7A6E78',
  price: '#2E2331',
  rating: '#C99A54',
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
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    minHeight: 104,
    paddingHorizontal: 19,
    paddingVertical: 17,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  date: {
    color: colors.date,
    fontSize: 11,
  },
  dropoff: {
    color: colors.dropoff,
    fontSize: 14,
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
    fontSize: 13,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.92,
  },
  price: {
    color: colors.price,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  rating: {
    color: colors.rating,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 88,
  },
});
