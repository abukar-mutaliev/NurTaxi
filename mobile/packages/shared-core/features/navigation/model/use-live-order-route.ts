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
const LOCAL_ROUTE_TIMEOUT_MS = 2500;

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

  const [built, setBuilt] = useState<{
    key: string;
    points: GeoPoint[];
    distanceM: number | null;
    duration: string | null;
  } | null>(null);

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
    const from = { lat: originLat, lng: originLng };
    const to = { lat: destinationLat, lng: destinationLng };

    const build = async () => {
      const localPromise = buildLocalRoute
        ? withTimeout(buildLocalRoute([from, to]), LOCAL_ROUTE_TIMEOUT_MS)
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

      const local = await localPromise;
      if (cancelled) {
        return;
      }
      if (local && local.points.length > 1) {
        setBuilt({
          distanceM: local.distanceM,
          duration: local.durationWithTraffic ?? local.duration,
          key: routeKey,
          points: local.points,
        });
        return;
      }

      const server = await serverPromise;
      if (cancelled || !server) {
        return;
      }
      setBuilt({
        distanceM: server.distanceM,
        duration: server.duration,
        key: routeKey,
        points: server.points,
      });
    };

    void build();

    return () => {
      cancelled = true;
    };
  }, [
    buildLocalRoute,
    destinationLat,
    destinationLng,
    enabled,
    fetchServerRoute,
    originLat,
    originLng,
    routeKey,
  ]);

  /**
   * Пока считается новый участок, на карте остаётся предыдущий: моргание линии
   * на каждом перестроении читается как сбой, хотя маршрут просто обновляется.
   */
  return {
    distanceM: built?.distanceM ?? null,
    duration: built?.duration ?? null,
    isBuilding: enabled && Boolean(routeKey) && built?.key !== routeKey,
    leg: orderRouteLeg(input.status),
    points: built?.points ?? null,
  };
}
