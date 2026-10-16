/**
 * Живой маршрут текущего заказа: от машины к клиенту, после посадки — к точке Б.
 *
 * Серверный `order.route.polyline` — это линия подачи→назначения на момент создания
 * заказа. Навигатору нужна актуальная геометрия от текущей позиции, поэтому участок
 * пересчитывается здесь. Сначала пробуем локальный строитель (MapKit у водителя),
 * если его нет — `GET /geo/route`.
 */
import { useEffect, useState } from 'react';

import { useLazyGetDrivingRouteQuery } from '@nurtaxi/shared-core/entities/geo';
import { decodePolyline, formatDuration, haversineDistance } from '@nurtaxi/shared-core/shared/lib';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

import { orderRouteLeg, orderRouteWaypoints, type OrderRouteLeg } from './order-route-leg';

/** Насколько машина должна сместиться, чтобы имело смысл перестраивать путь. */
const REBUILD_THRESHOLD_M = 150;
/** MapKit Transport иногда не отвечает — не блокируем серверный маршрут. */
const LOCAL_ROUTE_TIMEOUT_MS = 8000;
/** Дорога состоит хотя бы из трёх точек; две — прямая по воздуху. */
const ROAD_MIN_POINTS = 3;
/**
 * Сервер без OSRM отдаёт прямую из двух точек, а MapKit мог просто не успеть.
 * Пока дороги нет, пробуем снова, не дожидаясь смещения машины на 150 м.
 */
const ROAD_RETRY_MS = 6000;
const ROAD_RETRY_LIMIT = 5;

function roadPoints(points: GeoPoint[] | null | undefined): GeoPoint[] | null {
  return points && points.length >= ROAD_MIN_POINTS ? points : null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    void promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

export interface LocalDrivingRoute {
  points: GeoPoint[];
  distanceM: number | null;
  duration: string | null;
  durationWithTraffic?: string | null;
}

export interface LiveOrderRouteInput {
  status: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  origin?: GeoPoint | null;
  enabled?: boolean;
  /** Нативный маршрут (Yandex MapKit). `null` — переключаемся на сервер. */
  buildLocalRoute?: (points: GeoPoint[]) => Promise<LocalDrivingRoute | null>;
}

export interface LiveOrderRouteResult {
  points: GeoPoint[] | null;
  duration: string | null;
  distanceM: number | null;
  isBuilding: boolean;
  leg: OrderRouteLeg;
}

function useStableOrigin(origin: GeoPoint | null): GeoPoint | null {
  const [stable, setStable] = useState<GeoPoint | null>(origin);

  if (origin && (!stable || haversineDistance(stable, origin) > REBUILD_THRESHOLD_M)) {
    setStable(origin);
    return origin;
  }

  return origin ? stable : null;
}

export function useLiveOrderRoute(input: LiveOrderRouteInput): LiveOrderRouteResult {
  const { enabled = true, buildLocalRoute } = input;
  const waypoints = orderRouteWaypoints({
    dropoff: input.dropoff,
    origin: input.origin,
    pickup: input.pickup,
    status: input.status,
  });
  const origin = useStableOrigin(waypoints?.[0] ?? null);
  const destination = waypoints?.[1] ?? null;
  const [fetchServerRoute] = useLazyGetDrivingRouteQuery();

  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destinationLat = destination?.lat;
  const destinationLng = destination?.lng;
  const routeKey =
    originLat != null && originLng != null && destinationLat != null && destinationLng != null
      ? `${originLat},${originLng}>${destinationLat},${destinationLng}`
      : '';
  const leg = orderRouteLeg(input.status);
  // Подача и назначение не двигаются вместе с машиной: смена пары — уже другой заказ.
  const scope = `${input.pickup.lat},${input.pickup.lng}>${input.dropoff.lat},${input.dropoff.lng}`;

  const [built, setBuilt] = useState<{
    key: string;
    leg: OrderRouteLeg;
    scope: string;
    points: GeoPoint[];
    distanceM: number | null;
    duration: string | null;
  } | null>(null);
  /** Повторные попытки получить дорогу считаются для конкретной пары точек. */
  const [roadRetry, setRoadRetry] = useState({ attempt: 0, key: routeKey });
  const roadAttempt = roadRetry.key === routeKey ? roadRetry.attempt : 0;

  useEffect(() => {
    if (
      !enabled ||
      !routeKey ||
      originLat == null ||
      originLng == null ||
      destinationLat == null ||
      destinationLng == null
    ) {
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const from = { lat: originLat, lng: originLng };
    const to = { lat: destinationLat, lng: destinationLng };

    const apply = (next: {
      points: GeoPoint[];
      distanceM: number | null;
      duration: string | null;
    }) => {
      if (cancelled) {
        return;
      }
      setBuilt({ ...next, key: routeKey, leg, scope });
    };

    const scheduleRetry = () => {
      if (roadAttempt >= ROAD_RETRY_LIMIT) {
        return;
      }
      retryTimer = setTimeout(() => {
        if (!cancelled) {
          setRoadRetry({ attempt: roadAttempt + 1, key: routeKey });
        }
      }, ROAD_RETRY_MS);
    };

    const build = async () => {
      const localPromise: Promise<LocalDrivingRoute | null> = buildLocalRoute
        ? buildLocalRoute([from, to]).catch(() => null)
        : Promise.resolve(null);

      const serverPromise = fetchServerRoute({
        destLat: to.lat,
        destLng: to.lng,
        originLat: from.lat,
        originLng: from.lng,
      })
        .unwrap()
        .then((server) => {
          const points = server?.polyline ? decodePolyline(server.polyline) : [];
          if (points.length < 2) {
            return null;
          }
          return {
            distanceM: server?.distanceM ?? null,
            duration: server?.durationS != null ? formatDuration(server.durationS) : null,
            points,
          };
        })
        .catch(() => null);

      const local = await withTimeout(localPromise, LOCAL_ROUTE_TIMEOUT_MS);
      if (cancelled) {
        return;
      }

      const localDuration = local?.durationWithTraffic ?? local?.duration ?? null;
      const localRoad = roadPoints(local?.points);
      // MapKit уже посчитал время — не подменяем его серверной оценкой.
      if (localRoad) {
        apply({
          distanceM: local?.distanceM ?? null,
          duration: localDuration,
          points: localRoad,
        });
        return;
      }

      const server = await serverPromise;
      if (cancelled) {
        return;
      }

      const serverRoad = roadPoints(server?.points);
      const duration = localDuration ?? server?.duration ?? null;
      const distanceM = local?.distanceM ?? server?.distanceM ?? null;
      if (serverRoad || duration || distanceM != null) {
        apply({ distanceM, duration, points: serverRoad ?? [] });
      }

      // MapKit ответил после таймаута — его дорога точнее серверной прямой.
      void localPromise.then((late) => {
        const lateRoad = roadPoints(late?.points);
        if (!lateRoad) {
          return;
        }
        apply({
          distanceM: late?.distanceM ?? null,
          duration: late?.durationWithTraffic ?? late?.duration ?? null,
          points: lateRoad,
        });
      });

      if (!serverRoad) {
        scheduleRetry();
      }
    };

    void build();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [
    buildLocalRoute,
    destinationLat,
    destinationLng,
    enabled,
    fetchServerRoute,
    leg,
    originLat,
    originLng,
    roadAttempt,
    routeKey,
    scope,
  ]);

  /**
   * Пока тот же участок пересчитывается, на карте и в цифрах остаётся предыдущий
   * готовый маршрут: моргание линии читается как сбой. Цифры другого участка
   * (путь до клиента после посадки) не отдаём — иначе экран мигает на снимок заказа.
   */
  const visible = built != null && built.leg === leg && built.scope === scope ? built : null;

  return {
    distanceM: visible?.distanceM ?? null,
    duration: visible?.duration ?? null,
    isBuilding: enabled && Boolean(routeKey) && visible?.key !== routeKey,
    leg,
    points: visible?.points ?? null,
  };
}
