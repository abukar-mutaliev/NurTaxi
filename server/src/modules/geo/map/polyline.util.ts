import type { GeoPoint } from './map-provider.interface';

/** Google Encoded Polyline — формат, который ожидает мобильный клиент. */
export function encodePolyline(points: GeoPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    result += encodeSignedNumber(lat - lastLat);
    result += encodeSignedNumber(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }

  return result;
}

function encodeSignedNumber(value: number): string {
  let s = value < 0 ? ~(value << 1) : value << 1;
  let result = '';

  while (s >= 0x20) {
    result += String.fromCharCode((0x20 | (s & 0x1f)) + 63);
    s >>= 5;
  }
  result += String.fromCharCode(s + 63);

  return result;
}
