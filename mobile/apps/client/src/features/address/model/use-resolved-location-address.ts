/**
 * Для GPS-подписи и «Точки на карте» подтягиваем улицу по координатам.
 * Черновик при этом не меняем — GPS-точка подачи должна продолжать следовать за геолокацией.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  isPlaceholderAddress,
  toApiGeoLocation,
  toStoredGeoLocation,
} from '@nurtaxi/shared-core/shared/lib';
import type { GeoLocation, GeoPoint } from '@nurtaxi/shared-core/shared/model';
import {
  useLazyReverseGeocodeQuery,
  useLazySearchAddressesQuery,
} from '@nurtaxi/shared-core/entities/geo';

import { resolvePointAddress } from './resolve-point-address';
import { DEFAULT_REGION_ID, useOrderRegion } from './use-order-region';

function useResolvePointAddress() {
  const { regionId } = useOrderRegion();
  const [reverseGeocode] = useLazyReverseGeocodeQuery();
  const [searchAddresses] = useLazySearchAddressesQuery();

  return useCallback(
    (location: GeoLocation, extraLabels: readonly string[] = []) =>
      resolvePointAddress(
        location,
        extraLabels,
        {
          reverseViaApi: async (point: GeoPoint) => {
            try {
              const result = await reverseGeocode(point).unwrap();
              return result.address;
            } catch {
              return null;
            }
          },
          search: async (query) => {
            try {
              return await searchAddresses(query).unwrap();
            } catch {
              return [];
            }
          },
        },
        regionId ?? DEFAULT_REGION_ID,
      ),
    [regionId, reverseGeocode, searchAddresses],
  );
}

export function useResolvedLocationAddress(
  location: GeoLocation | null | undefined,
  extraPlaceholderLabels: readonly string[] = [],
): string | undefined {
  const resolvePoint = useResolvePointAddress();
  const [resolved, setResolved] = useState<{ key: string; address: string }>();
  const needsResolution = Boolean(
    location && isPlaceholderAddress(location.address, extraPlaceholderLabels),
  );
  const lat = location ? Number(location.lat.toFixed(4)) : 0;
  const lng = location ? Number(location.lng.toFixed(4)) : 0;
  const extraKey = extraPlaceholderLabels.join('\0');
  const requestKey = needsResolution ? `${lat},${lng}|${extraKey}` : '';

  useEffect(() => {
    if (!location || !needsResolution) {
      return;
    }

    let cancelled = false;
    void resolvePoint(location, extraPlaceholderLabels).then((address) => {
      if (!cancelled && address) {
        setResolved({ key: requestKey, address });
      }
    });

    return () => {
      cancelled = true;
    };
    // extraPlaceholderLabels склеиваем в extraKey — родитель часто передаёт новый массив.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- location читаем по округлённым lat/lng
  }, [extraKey, lat, lng, needsResolution, requestKey, resolvePoint]);

  if (!location) {
    return undefined;
  }

  if (!needsResolution) {
    return location.address;
  }

  return (resolved?.key === requestKey ? resolved.address : undefined) ?? location.address;
}

/** Перед POST /orders ждём улицу по координатам, а не отправляем подпись кнопки. */
export function useResolveLocationForOrder(myLocationLabel = '') {
  const resolvePoint = useResolvePointAddress();

  return useCallback(
    async (location: GeoLocation): Promise<GeoLocation> => {
      const labels = myLocationLabel ? [myLocationLabel] : [];
      if (!isPlaceholderAddress(location.address, labels)) {
        return toApiGeoLocation(location);
      }

      const address = await resolvePoint(location, labels);
      return toStoredGeoLocation(location, address);
    },
    [myLocationLabel, resolvePoint],
  );
}
