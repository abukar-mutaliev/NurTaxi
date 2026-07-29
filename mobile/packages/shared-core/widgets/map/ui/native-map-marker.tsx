import { Marker } from 'expo-yandex-mapkit';
import { StyleSheet, Text, View } from 'react-native';

import { isValidGeoPoint, normalizeGeoPoint, toMapPoint } from '../model/map-provider';
import type { MapMarker } from './map-canvas';
import { MAP_MARKER_BITMAP_SCALE, MAP_MARKER_SOURCES } from './map-marker.assets';
import { getMarkerAnchor } from './map-marker.constants';

interface NativeMapMarkerProps {
  marker: MapMarker;
}

/**
 * Водитель — PNG через `source`. A/B — компактные View-иконки с фиксированным layout:
 * MapKit на Android стабильнее показывает несколько таких маркеров, чем bitmap `source`.
 */
export function NativeMapMarker({ marker }: NativeMapMarkerProps) {
  if (!isValidGeoPoint(marker.point)) {
    return null;
  }

  const point = normalizeGeoPoint(marker.point);

  if (marker.kind === 'driver') {
    return (
      <Marker
        anchor={getMarkerAnchor('driver')}
        identifier={marker.id}
        point={toMapPoint(point)}
        scale={MAP_MARKER_BITMAP_SCALE}
        source={MAP_MARKER_SOURCES.driver}
      />
    );
  }

  const isPickup = marker.kind === 'pickup';

  return (
    <Marker
      anchor={getMarkerAnchor(marker.kind)}
      identifier={marker.id}
      point={toMapPoint(point)}
      tracksViewChanges={false}
    >
      <View style={styles.pinRoot}>
        <View style={[styles.pinBadge, isPickup ? styles.pickupBadge : styles.dropoffBadge]}>
          <Text style={[styles.pinLetter, isPickup ? styles.pickupLetter : styles.dropoffLetter]}>
            {isPickup ? 'A' : 'B'}
          </Text>
        </View>
        <View style={[styles.pinStem, isPickup ? styles.pickupStem : styles.dropoffStem]} />
      </View>
    </Marker>
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
    width: 28,
  },
  pinLetter: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinRoot: {
    alignItems: 'center',
    height: 36,
    width: 28,
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
