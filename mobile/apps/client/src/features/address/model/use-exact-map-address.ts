/**
 * Точный адрес точки на карте: сначала MapKit, затем `/geo/reverse`.
 * Город без улицы и дома не подставляем — в истории останется «Точка на карте».
 */
import { useCallback } from 'react';

import { useLazyReverseGeocodeQuery } from '@nurtaxi/shared-core/entities/geo';
import { exactAddressFromText } from '@nurtaxi/shared-core/shared/lib';
import { reverseGeocodeExact } from '@nurtaxi/shared-core/shared/lib/yandex-geo';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

const EXACT_LOOKUP_TIMEOUT_MS = 4000;

function withTimeout(work: Promise<string | null>): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), EXACT_LOOKUP_TIMEOUT_MS);
    work.then(
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

export function useExactMapAddress() {
  const [reverseGeocode] = useLazyReverseGeocodeQuery();

  return useCallback(
    (point: GeoPoint) =>
      withTimeout(
        (async () => {
          const fromMap = await reverseGeocodeExact(point);
          if (fromMap) {
            return fromMap;
          }

          try {
            const result = await reverseGeocode({ lat: point.lat, lng: point.lng }).unwrap();
            return exactAddressFromText(result.address);
          } catch {
            return null;
          }
        })(),
      ),
    [reverseGeocode],
  );
}
