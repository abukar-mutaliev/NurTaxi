/**
 * Декодирование Google Encoded Polyline — формат, в котором сервер отдаёт маршрут
 * (`OrderRoute.polyline`). Нужен, чтобы нарисовать линию поездки на карте.
 */
import type { GeoPoint } from '../../model/api-types';

export function decodePolyline(encoded: string): GeoPoint[] {
  if (!encoded) {
    return [];
  }

  const points: GeoPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/** Прямоугольник, охватывающий все точки, — для автоматического зума карты. */
export function boundsOf(points: GeoPoint[]): {
  center: GeoPoint;
  latitudeDelta: number;
  longitudeDelta: number;
} | null {
  if (points.length === 0) {
    return null;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const { lat, lng } of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  // 40% запаса, чтобы маркеры не прилипали к краям экрана.
  const PADDING = 1.4;
  return {
    center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
    latitudeDelta: Math.max((maxLat - minLat) * PADDING, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * PADDING, 0.01),
  };
}

/** Расстояние по прямой между двумя точками в метрах (формула гаверсинусов). */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
