/**
 * Маршрут текущего заказа, построенный на устройстве через Yandex Transport (M8.5).
 *
 * Сервер отдаёт `order.route.polyline` — линию от точки подачи до точки Б, снятую в момент
 * создания заказа. Водителю этого мало: пока он едет за пассажиром, ему нужен путь от его
 * собственной позиции, а после посадки — актуальный путь до точки Б. Поэтому маршрут
 * строится здесь, а серверная линия остаётся запасным вариантом (`fallbackPolyline`),
 * когда MapKit собран в `lite` или недоступен.
 */
import { useEffect, useState } from 'react';

import { haversineDistance } from '@nurtaxi/shared-core/shared/lib';
import { OrderStatus, type GeoPoint } from '@nurtaxi/shared-core/shared/model';

import { buildDrivingRoute, isYandexGeoAvailable, type YandexRoute } from '@/shared/lib/yandex-geo';

/**
 * Насколько водитель должен сместиться, чтобы маршрут имело смысл перестраивать.
 * Меньший порог сжигает батарею и квоту MapKit на каждый GPS-тик, больший — заметно
 * отстаёт от реального положения машины.
 */
const REBUILD_THRESHOLD_M = 150;

export interface OrderRouteInput {
  status: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  /** Текущая позиция водителя; пока её нет, маршрут строится от точки подачи. */
  driverPosition?: GeoPoint | null;
  /** Пока заказ не загружен или уже завершён, строить нечего. */
  enabled?: boolean;
}

export interface OrderRouteResult {
  /** Геометрия для `MapCanvas.routePoints`; `null` — рисуем серверную линию. */
  points: GeoPoint[] | null;
  /** Готовая к показу длительность с учётом пробок, например «23 мин». */
  duration: string | null;
  distanceM: number | null;
  isBuilding: boolean;
  /** Текущий отрезок — от него зависит подпись «До клиента» / «До точки Б». */
  leg: 'to-pickup' | 'to-dropoff';
}

/** До посадки водитель едет к клиенту, после — к точке назначения. */
function isHeadingToPickup(status: string): boolean {
  return (
    status === OrderStatus.DriverAssigned ||
    status === OrderStatus.DriverEnRoute ||
    status === OrderStatus.DriverArrived
  );
}

function waypointsFor({
  status,
  pickup,
  dropoff,
  driverPosition,
}: OrderRouteInput): [GeoPoint, GeoPoint] {
  if (isHeadingToPickup(status)) {
    // Без позиции водителя вести к клиенту неоткуда — показываем сам путь поездки.
    return driverPosition ? [driverPosition, pickup] : [pickup, dropoff];
  }
  return [driverPosition ?? pickup, dropoff];
}

/**
 * Ключ пересчёта: маршрут перестраивается при смене этапа заказа и при заметном
 * смещении водителя, но не на каждый GPS-тик.
 */
function useStableOrigin(origin: GeoPoint): GeoPoint {
  const [stable, setStable] = useState(origin);

  if (haversineDistance(stable, origin) > REBUILD_THRESHOLD_M) {
    setStable(origin);
  }

  return stable;
}

export function useOrderRoute(input: OrderRouteInput): OrderRouteResult {
  const { enabled = true } = input;
  const [origin, destination] = waypointsFor(input);
  const stableOrigin = useStableOrigin(origin);

  const [built, setBuilt] = useState<{ key: string; route: YandexRoute } | null>(null);
  const [supported, setSupported] = useState(isYandexGeoAvailable);

  const originLat = stableOrigin.lat;
  const originLng = stableOrigin.lng;
  const destinationLat = destination.lat;
  const destinationLng = destination.lng;
  const routeKey = `${originLat},${originLng}>${destinationLat},${destinationLng}`;

  useEffect(() => {
    if (!enabled || !supported) {
      return;
    }

    let cancelled = false;

    void buildDrivingRoute([
      { lat: originLat, lng: originLng },
      { lat: destinationLat, lng: destinationLng },
    ]).then((next) => {
      if (cancelled) {
        return;
      }
      if (!next) {
        // `null` — MapKit не умеет строить маршруты в этой сборке: больше не пробуем.
        setSupported(false);
        return;
      }
      setBuilt({ key: routeKey, route: next });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, supported, routeKey, originLat, originLng, destinationLat, destinationLng]);

  /**
   * Пока считается новый маршрут, на карте остаётся предыдущий: моргание линии на каждом
   * перестроении читается как сбой, хотя маршрут просто обновляется.
   */
  const route = built?.route ?? null;

  return {
    distanceM: route?.distanceM ?? null,
    duration: route?.durationWithTraffic ?? route?.duration ?? null,
    isBuilding: enabled && supported && built?.key !== routeKey,
    leg: isHeadingToPickup(input.status) ? 'to-pickup' : 'to-dropoff',
    points: route?.points ?? null,
  };
}
