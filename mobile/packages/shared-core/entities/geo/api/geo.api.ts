/**
 * Поиск адресов — `GET /geo/search` (M3.4, `§8.9`).
 * Сервер сам учитывает специфику адресации Северного Кавказа и кэширует ответы в Redis.
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type { AddressSuggestion, GeoSearchQuery } from '@nurtaxi/shared-core/shared/model';

export const geoApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchAddresses: build.query<AddressSuggestion[], GeoSearchQuery>({
      query: ({ q, regionId, lat, lng, limit = 10 }) => ({
        url: '/geo/search',
        params: { q, regionId, lat, lng, limit },
      }),
      // Поисковые ответы не переиспользуем между разными запросами дольше минуты.
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useSearchAddressesQuery, useLazySearchAddressesQuery } = geoApi;

/** Сервер требует минимум 2 символа — не тратим запрос впустую. */
export const MIN_GEO_QUERY_LENGTH = 2;
