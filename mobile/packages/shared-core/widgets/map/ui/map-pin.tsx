import { StyleSheet, Text, View } from 'react-native';

import { MAP_PIN_HEIGHT, MAP_PIN_WIDTH } from './map-marker.constants';

interface MapPinProps {
  kind: 'pickup' | 'dropoff';
}

/** Визуал пина A/B без MapKit Placemark — рисуется поверх карты в экранных координатах. */
export function MapPin({ kind }: MapPinProps) {
  const isPickup = kind === 'pickup';

  return (
    <View collapsable={false} style={styles.pinRoot}>
      <View style={[styles.pinBadge, isPickup ? styles.pickupBadge : styles.dropoffBadge]}>
        <Text style={[styles.pinLetter, isPickup ? styles.pickupLetter : styles.dropoffLetter]}>
          {isPickup ? 'A' : 'B'}
        </Text>
      </View>
      <View style={[styles.pinStem, isPickup ? styles.pickupStem : styles.dropoffStem]} />
    </View>
  );
}

const styles = StyleSheet.create({
  dropoffBadge: {
    backgroundColor: '#2E2331',
    borderColor: '#FFFFFF',
  },
  dropoffLetter: {
    color: '#FFFFFF',
  },
  dropoffStem: {
    backgroundColor: '#2E2331',
  },
  pinBadge: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: MAP_PIN_WIDTH,
  },
  pinLetter: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinRoot: {
    alignItems: 'center',
    height: MAP_PIN_HEIGHT,
    width: MAP_PIN_WIDTH,
  },
  pinStem: {
    borderRadius: 1,
    height: 8,
    marginTop: -1,
    width: 2,
  },
  pickupBadge: {
    backgroundColor: '#E8C882',
    borderColor: '#FFFFFF',
  },
  pickupLetter: {
    color: '#2E2331',
  },
  pickupStem: {
    backgroundColor: '#C99A54',
  },
});
