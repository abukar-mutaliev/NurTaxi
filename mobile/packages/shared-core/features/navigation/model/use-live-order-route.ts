/**
 * Живой маршрут текущего заказа: от машины к клиенту, после посадки — через остановки к точке Б.
 *
 * Серверный `order.route.polyline` — это линия подачи→назначения на момент создания
 * заказа. Навигатору нужна актуальная геометрия от текущей позиции, поэтому участок
 * пересчитывается здесь. Сначала пробуем локальный строитель (MapKit у водителя),
 * если его нет — `GET /geo/route` (по отрезку на каждую пару точек).
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
/** Машина подъехала к остановке ближе этого — остановка пройдена, ведём к следующей точке. */
const STOP_REACHED_M = 150;

function pointsKey(points: GeoPoint[]): string {
  return points.map((point) => `${point.lat},${point.lng}`).join(';');
}

function parsePointsKey(key: string): GeoPoint[] {
  return key
    ? key.split(';').map((pair) => {
        const [lat, lng] = pair.split(',');
        return { lat: Number(lat), lng: Number(lng) };
      })
    : [];
}

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
  /** Промежуточные остановки заказа по порядку. */
  stops?: GeoPoint[] | null;
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
  /** Ближайшая цель участка: клиент, следующая непройденная остановка или точка Б. */
  target: GeoPoint | null;
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
  const stops = input.stops ?? [];
  const leg = orderRouteLeg(input.status);
  // Подача, остановки и назначение не двигаются вместе с машиной: их смена — уже другой заказ.
  const scope =
    `${input.pickup.lat},${input.pickup.lng}>${input.dropoff.lat},${input.dropoff.lng}` +
    `|${pointsKey(stops)}`;

  /**
   * Сколько остановок машина уже проехала. Держим в состоянии: проехав остановку, машина
   * от неё удаляется, и по одной текущей позиции этого уже не понять.
   */
  const [passedStops, setPassedStops] = useState({ count: 0, scope });
  const passedCount = passedStops.scope === scope ? passedStops.count : 0;
  const nextStop = stops[passedCount];
  if (
    leg === 'to-dropoff' &&
    nextStop &&
    input.origin &&
    haversineDistance(input.origin, nextStop) < STOP_REACHED_M
  ) {
    setPassedStops({ count: passedCount + 1, scope });
  }

  const waypoints = orderRouteWaypoints({
    dropoff: input.dropoff,
    origin: input.origin,
    pickup: input.pickup,
    status: input.status,
    stopsAhead: stops.slice(passedCount),
  });
  const origin = useStableOrigin(waypoints?.[0] ?? null);
  const [fetchServerRoute] = useLazyGetDrivingRouteQuery();

  const originLat = origin?.lat;
  const originLng = origin?.lng;
  /** Точки после машины: оставшиеся остановки и цель участка. Строкой — для зависимостей эффекта. */
  const targetsKey = waypoints && waypoints.length > 1 ? pointsKey(waypoints.slice(1)) : '';
  const routeKey =
    originLat != null && originLng != null && targetsKey
      ? `${originLat},${originLng}>${targetsKey}`
      : '';

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
    if (!enabled || !routeKey || originLat == null || originLng == null || !targetsKey) {
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const from = { lat: originLat, lng: originLng };
    const chain = [from, ...parsePointsKey(targetsKey)];

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

    /** Один отрезок с сервера; `null` — не построился. */
    const fetchSegment = (a: GeoPoint, b: GeoPoint) =>
      fetchServerRoute({ destLat: b.lat, destLng: b.lng, originLat: a.lat, originLng: a.lng })
        .unwrap()
        .then((server) => {
          const points = server?.polyline ? decodePolyline(server.polyline) : [];
          if (points.length < 2) {
            return null;
          }
          return { distanceM: server?.distanceM ?? null, durationS: server?.durationS, points };
        })
        .catch(() => null);

    const build = async () => {
      const localPromise: Promise<LocalDrivingRoute | null> = buildLocalRoute
        ? buildLocalRoute(chain).catch(() => null)
        : Promise.resolve(null);

      // `GET /geo/route` знает только пару точек — с остановками склеиваем отрезки по порядку.
      const serverPromise = Promise.all(
        chain.slice(1).map((point, index) => fetchSegment(chain[index]!, point)),
      ).then((segments) => {
        if (segments.some((segment) => segment == null)) {
          return null;
        }
        const parts = segments as NonNullable<(typeof segments)[number]>[];
        const points = parts.flatMap((part, index) =>
          index === 0 ? part.points : part.points.slice(1),
        );
        const distanceM = parts.every((part) => part.distanceM != null)
          ? parts.reduce((sum, part) => sum + (part.distanceM ?? 0), 0)
          : null;
        const durationS = parts.every((part) => part.durationS != null)
          ? parts.reduce((sum, part) => sum + (part.durationS ?? 0), 0)
          : null;
        return {
          distanceM,
          duration: durationS != null ? formatDuration(durationS) : null,
          points,
        };
      });

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
    enabled,
    fetchServerRoute,
    leg,
    originLat,
    originLng,
    roadAttempt,
    routeKey,
    scope,
    targetsKey,
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
    target: waypoints?.[1] ?? null,
  };
}
