/**
 * Дорожный маршрут для карты клиента. Яндекс MapKit строит путь по улицам.
 * Прямая из двух точек — серверный запасной вариант, её на карту не кладём.
 */
import { useEffect, useState } from 'react';

import { decodePolyline } from '@nurtaxi/shared-core/shared/lib';
import { buildDrivingRoute } from '@nurtaxi/shared-core/shared/lib/yandex-geo';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

/** Две точки — отрезок по воздуху. Дорога состоит хотя бы из трёх. */
export function isRoadGeometry(points: GeoPoint[] | null | undefined): points is GeoPoint[] {
  return Boolean(points && points.length >= 3);
}

/** Точки уличного маршрута. Прямая из двух точек сюда не попадает. */
export function roadFromPolyline(encoded: string | null | undefined): GeoPoint[] | null {
  if (!encoded) {
    return null;
  }

  const points = decodePolyline(encoded);
  return isRoadGeometry(points) ? points : null;
}

/** `null`, если в полилинии нет изгиба дороги. */
export function roadPolylineOrNull(encoded: string | null | undefined): string | null {
  if (!encoded) {
    return null;
  }

  return isRoadGeometry(decodePolyline(encoded)) ? encoded : null;
}

function routeKey(points: GeoPoint[] | null): string {
  if (!points || points.length < 2) {
    return '';
  }

  return points.map((point) => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`).join('>');
}

/** Линия MapKit между точками. Пока ответа нет или он прямой — `null`. */
export function useRoadRoute(waypoints: GeoPoint[] | null): GeoPoint[] | null {
  const key = routeKey(waypoints);
  const [built, setBuilt] = useState<{ key: string; points: GeoPoint[] } | null>(null);

  useEffect(() => {
    if (!key || !waypoints || waypoints.length < 2) {
      return;
    }

    let cancelled = false;
    void buildDrivingRoute(waypoints).then((route) => {
      if (cancelled || !isRoadGeometry(route?.points)) {
        return;
      }
      setBuilt({ key, points: route.points });
    });

    return () => {
      cancelled = true;
    };
    // Ключ уже кодирует координаты. Новый массив с теми же точками маршрут не пересчитывает.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- waypoints читаем через key
  }, [key]);

  return built?.key === key ? built.points : null;
}
