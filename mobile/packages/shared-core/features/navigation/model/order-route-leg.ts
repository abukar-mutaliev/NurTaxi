import { OrderStatus, type GeoPoint } from '@nurtaxi/shared-core/shared/model';

export type OrderRouteLeg = 'to-pickup' | 'to-dropoff';

/** До посадки водитель едет к клиенту, после — к точке назначения. */
export function orderRouteLeg(status: string): OrderRouteLeg {
  if (
    status === OrderStatus.DriverAssigned ||
    status === OrderStatus.DriverEnRoute ||
    status === OrderStatus.DriverArrived
  ) {
    return 'to-pickup';
  }

  return 'to-dropoff';
}

function isUsablePoint(point?: GeoPoint | null): point is GeoPoint {
  if (!point) {
    return false;
  }

  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    !(point.lat === 0 && point.lng === 0)
  );
}

/**
 * Точки текущего участка навигации.
 * Пока нет позиции машины, путь до клиента строить неоткуда — возвращаем `null`,
 * а не подменяем его линией подачи→назначения: это другой участок.
 */
export function orderRouteWaypoints(input: {
  status: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  origin?: GeoPoint | null;
}): [GeoPoint, GeoPoint] | null {
  const { pickup, dropoff, origin } = input;

  if (!isUsablePoint(pickup) || !isUsablePoint(dropoff)) {
    return null;
  }

  if (orderRouteLeg(input.status) === 'to-pickup') {
    return isUsablePoint(origin) ? [origin, pickup] : null;
  }

  return [isUsablePoint(origin) ? origin : pickup, dropoff];
}
