import type { MapMarker } from './map-canvas';

export const MAP_PIN_WIDTH = 28;
export const MAP_PIN_HEIGHT = 42;
export const MAP_DRIVER_WIDTH = 52;
export const MAP_DRIVER_HEIGHT = 26;

export function getMarkerAnchor(kind: MapMarker['kind']): { x: number; y: number } {
  if (kind === 'driver') {
    return { x: 0.5, y: 0.5 };
  }

  return { x: 0.5, y: 1 };
}
