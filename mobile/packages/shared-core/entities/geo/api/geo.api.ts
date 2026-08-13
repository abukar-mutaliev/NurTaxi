/**
 * Геосервис: поиск адресов (`GET /geo/search`) и дорожный маршрут (`GET /geo/route`).
 * Сервер учитывает адресацию Северного Кавказа и кэширует ответы в Redis.
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  AddressSuggestion,
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
  }),
});

export const {
  useGetDrivingRouteQuery,
  useLazyGetDrivingRouteQuery,
  useLazySearchAddressesQuery,
  useSearchAddressesQuery,
} = geoApi;

/** Сервер требует минимум 2 символа — не тратим запрос впустую. */
export const MIN_GEO_QUERY_LENGTH = 2;
