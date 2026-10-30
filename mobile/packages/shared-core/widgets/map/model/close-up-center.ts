/**
 * Точки кадра ближе ~300 м друг к другу не вписываем, а показываем квартал вокруг них:
 * машина у подъезда давала кадр в пару домов, где не понять, что происходит.
 */
const MIN_FIT_SPAN_DEG = 0.003;

/** Масштаб квартала для кадра из близких точек. */
export const CLOSE_UP_ZOOM = 16;

interface MapPointLike {
  latitude: number;
  longitude: number;
}

/** Середина точек, если все они умещаются в `MIN_FIT_SPAN_DEG`; иначе `null` — вписываем как есть. */
export function closeUpCenter(points: MapPointLike[]): MapPointLike | null {
  if (points.length === 0) {
    return null;
  }
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  if (maxLat - minLat > MIN_FIT_SPAN_DEG || maxLng - minLng > MIN_FIT_SPAN_DEG) {
    return null;
  }
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 };
}
