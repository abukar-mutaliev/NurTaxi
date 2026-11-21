/**
 * Привязка машины к линии маршрута.
 *
 * GPS в городе ошибается на 5–15 метров, и сырая точка ставит машину то на тротуар, то во
 * двор, то на встречную полосу — рядом с линией, по которой она на самом деле едет. Если
 * машина в пределах погрешности от маршрута, показываем её на самой линии.
 *
 * Привязка — только для картинки. Строить маршрут и считать расстояния нужно от настоящей
 * точки: иначе машина, свернувшая с маршрута, «ехала» бы по старой линии.
 */
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

/** Дальше — машина уже не на этой дороге (соседняя улица, объезд): показываем как есть. */
export const SNAP_MAX_DISTANCE_M = 30;

const METERS_PER_DEG_LAT = 111_320;

/**
 * Ближайшая к `point` точка линии `route`, если до неё не дальше `maxDistanceM`; иначе сама
 * `point`. Линия из одной точки (или её отсутствие) точку не меняет.
 */
export function snapToRoute(
  point: GeoPoint,
  route: readonly GeoPoint[] | null | undefined,
  maxDistanceM: number = SNAP_MAX_DISTANCE_M,
): GeoPoint {
  if (!route || route.length < 2) {
    return point;
  }

  /**
   * На масштабе десятков метров землю можно считать плоской: метры на градус долготы
   * берём на широте самой точки. Начало координат — в `point`.
   */
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180);
  const toX = (lng: number) => (lng - point.lng) * metersPerDegLng;
  const toY = (lat: number) => (lat - point.lat) * METERS_PER_DEG_LAT;

  let bestDistanceSq = maxDistanceM * maxDistanceM;
  let best: { x: number; y: number } | null = null;

  let ax = toX(route[0]!.lng);
  let ay = toY(route[0]!.lat);
  for (let index = 1; index < route.length; index += 1) {
    const end = route[index]!;
    const bx = toX(end.lng);
    const by = toY(end.lat);
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    // Доля отрезка, на которую приходится перпендикуляр из начала координат.
    const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSq));
    const x = ax + t * dx;
    const y = ay + t * dy;
    const distanceSq = x * x + y * y;
    if (distanceSq <= bestDistanceSq) {
      bestDistanceSq = distanceSq;
      best = { x, y };
    }
    ax = bx;
    ay = by;
  }

  if (!best) {
    return point;
  }
  // Точка и так на линии — возвращаем её же, чтобы не плодить новые объекты.
  if (best.x === 0 && best.y === 0) {
    return point;
  }
  return {
    lat: point.lat + best.y / METERS_PER_DEG_LAT,
    lng: metersPerDegLng === 0 ? point.lng : point.lng + best.x / metersPerDegLng,
  };
}
