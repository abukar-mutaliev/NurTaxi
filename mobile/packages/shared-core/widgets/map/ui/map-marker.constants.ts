import type { MapMarker } from './map-canvas';

export const MAP_PIN_WIDTH = 28;
/** Высота View-пина A/B: бейдж 28 + ножка 8. Якорь — нижний центр (кончик ножки). */
export const MAP_PIN_HEIGHT = 36;
export const MAP_DRIVER_WIDTH = 52;
export const MAP_DRIVER_HEIGHT = 26;

export function getMarkerAnchor(kind: MapMarker['kind']): { x: number; y: number } {
  if (kind === 'driver') {
    return { x: 0.5, y: 0.5 };
  }

  return { x: 0.5, y: 1 };
}

/** Экранная позиция пина: кончик ножки в точке на карте, не левый край View. */
export function pinOverlayStyle(screen: { x: number; y: number }): {
  left: number;
  top: number;
} {
  const anchor = getMarkerAnchor('pickup');
  return {
    left: screen.x - MAP_PIN_WIDTH * anchor.x,
    top: screen.y - MAP_PIN_HEIGHT * anchor.y,
  };
}
