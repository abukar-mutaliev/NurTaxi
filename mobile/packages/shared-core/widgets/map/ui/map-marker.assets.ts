import { PixelRatio, type ImageSourcePropType } from 'react-native';

import type { MapMarker } from './map-canvas';

/** PNG-маркеры @2x: 56×84 у пина, 104×52 у машинки. */
export const MAP_MARKER_SOURCES: Record<MapMarker['kind'], ImageSourcePropType> = {
  pickup: require('../assets/markers/pin-pickup.png'),
  dropoff: require('../assets/markers/pin-dropoff.png'),
  driver: require('../assets/markers/pin-driver.png'),
};

/**
 * MapKit рисует битмап в физических пикселях. Ассеты @2x, поэтому масштаб —
 * плотность экрана / 2: на телефоне пин остаётся ~28 dp, а не сжимается в точку.
 */
export const MAP_MARKER_BITMAP_SCALE = PixelRatio.get() / 2;
