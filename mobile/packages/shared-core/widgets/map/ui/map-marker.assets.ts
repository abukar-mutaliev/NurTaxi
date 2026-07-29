import type { ImageSourcePropType } from 'react-native';

import type { MapMarker } from './map-canvas';

/** PNG-маркеры @2x: отображаются через `scale={0.5}` в MapKit. */
export const MAP_MARKER_SOURCES: Record<MapMarker['kind'], ImageSourcePropType> = {
  pickup: require('../assets/markers/pin-pickup.png'),
  dropoff: require('../assets/markers/pin-dropoff.png'),
  driver: require('../assets/markers/pin-driver.png'),
};

/** MapKit `scale` для @2x ассетов под логический размер пина. */
export const MAP_MARKER_BITMAP_SCALE = 0.5;
