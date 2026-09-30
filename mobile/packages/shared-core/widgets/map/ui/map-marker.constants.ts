import type { MapMarker } from './map-canvas';

/**
 * Доля иконки, которой метка крепится к координате.
 * Пин A/B — нижний центр (кончик), машинка — центр корпуса.
 * Без якоря MapKit сажает иконку левым краем, и точка визуально оказывается в стороне.
 */
export function getMarkerAnchor(kind: MapMarker['kind']): { x: number; y: number } {
  if (kind === 'driver') {
    return { x: 0.5, y: 0.5 };
  }

  return { x: 0.5, y: 1 };
}
