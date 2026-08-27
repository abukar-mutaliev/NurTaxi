/**
 * Для GPS-подписи и «Точки на карте» подтягиваем улицу по координатам.
 * Черновик при этом не меняем — GPS-точка подачи должна продолжать следовать за геолокацией.
 */
import { formatShortDisplayAddress, isPlaceholderAddress } from '@nurtaxi/shared-core/shared/lib';
import type { GeoLocation } from '@nurtaxi/shared-core/shared/model';
import { useReverseGeocodeQuery } from '@nurtaxi/shared-core/entities/geo';

export function useResolvedLocationAddress(
  location: GeoLocation | null | undefined,
  extraPlaceholderLabels: readonly string[] = [],
): string | undefined {
  const needsResolution = Boolean(
    location && isPlaceholderAddress(location.address, extraPlaceholderLabels),
  );
  const lat = location ? Number(location.lat.toFixed(4)) : 0;
  const lng = location ? Number(location.lng.toFixed(4)) : 0;

  const { data } = useReverseGeocodeQuery({ lat, lng }, { skip: !needsResolution });

  if (!location) {
    return undefined;
  }

  if (!needsResolution) {
    return location.address;
  }

  const resolved = data?.address?.trim();
  if (!resolved || isPlaceholderAddress(resolved, extraPlaceholderLabels)) {
    return location.address;
  }

  return formatShortDisplayAddress(resolved) || resolved;
}
