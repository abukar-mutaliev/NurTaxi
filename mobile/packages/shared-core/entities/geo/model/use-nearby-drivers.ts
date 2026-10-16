/**
 * Свободные машины вокруг точки на карте клиента.
 * Координаты округляются примерно до 100 м, чтобы дрожание GPS не плодило запросы,
 * а сами позиции обновляются опросом, пока экран их показывает.
 */
import { useGetNearbyDriversQuery, type NearbyDriver } from '../api/geo.api';

const POLL_MS = 8_000;

function roundCoord(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function useNearbyDrivers(options: {
  regionId?: string | null;
  point?: { lat: number; lng: number } | null;
  enabled?: boolean;
}): NearbyDriver[] {
  const { point, regionId } = options;
  const active = Boolean(
    (options.enabled ?? true) &&
    regionId &&
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng),
  );

  const { data } = useGetNearbyDriversQuery(
    {
      regionId: regionId ?? '',
      lat: point ? roundCoord(point.lat) : 0,
      lng: point ? roundCoord(point.lng) : 0,
    },
    { pollingInterval: active ? POLL_MS : 0, skip: !active },
  );

  return active ? (data ?? []) : [];
}
