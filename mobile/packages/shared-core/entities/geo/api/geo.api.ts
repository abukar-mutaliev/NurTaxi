/**
 * Геосервис: поиск адресов (`GET /geo/search`), маршрут (`GET /geo/route`)
 * и адрес по координатам (`GET /geo/reverse`).
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  AddressSuggestion,
  GeoReverseQuery,
  GeoReverseResult,
  GeoRouteQuery,
  GeoSearchQuery,
  OrderRoute,
} from '@nurtaxi/shared-core/shared/model';

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
    getDrivingRoute: build.query<OrderRoute | null, GeoRouteQuery>({
      query: ({ originLat, originLng, destLat, destLng }) => ({
        url: '/geo/route',
        params: { originLat, originLng, destLat, destLng },
      }),
      keepUnusedDataFor: 60,
    }),
    reverseGeocode: build.query<GeoReverseResult, GeoReverseQuery>({
      query: ({ lat, lng }) => ({
        url: '/geo/reverse',
        params: { lat, lng },
      }),
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetDrivingRouteQuery,
  useLazyGetDrivingRouteQuery,
  useLazyReverseGeocodeQuery,
  useLazySearchAddressesQuery,
  useReverseGeocodeQuery,
  useSearchAddressesQuery,
} = geoApi;

/** Сервер требует минимум 2 символа — не тратим запрос впустую. */
export const MIN_GEO_QUERY_LENGTH = 2;
