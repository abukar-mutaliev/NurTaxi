/**
 * Маршрут текущего заказа, построенный на устройстве через Yandex Transport (M8.5).
 *
 * Сервер отдаёт `order.route.polyline` — линию от точки подачи до точки Б, снятую в момент
 * создания заказа. Водителю этого мало: пока он едет за пассажиром, ему нужен путь от его
 * собственной позиции, а после посадки — актуальный путь до точки Б.
 *
 * Сначала пробуем MapKit (`flavor: 'full'`), если его нет — `GET /geo/route`.
 */
import { useLiveOrderRoute } from '@nurtaxi/shared-core/features/navigation';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

import { buildDrivingRoute, isYandexGeoAvailable } from '@/shared/lib/yandex-geo';

export interface OrderRouteInput {
  status: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  /** Текущая позиция водителя; пока её нет, участок до клиента не рисуем. */
  driverPosition?: GeoPoint | null;
  /** Пока заказ не загружен или уже завершён, строить нечего. */
  enabled?: boolean;
}

export type { LiveOrderRouteResult as OrderRouteResult } from '@nurtaxi/shared-core/features/navigation';

export function useOrderRoute(input: OrderRouteInput) {
  return useLiveOrderRoute({
    buildLocalRoute: isYandexGeoAvailable() ? buildDrivingRoute : undefined,
    dropoff: input.dropoff,
    enabled: input.enabled,
    origin: input.driverPosition,
    pickup: input.pickup,
    status: input.status,
  });
}
