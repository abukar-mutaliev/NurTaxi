/**
 * Геосервис: поиск адресов (`GET /geo/search`), маршрут (`GET /geo/route`),
 * адрес по координатам (`GET /geo/reverse`) и свободные машины рядом
 * (`GET /geo/nearby-drivers`).
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

/** Свободная машина на карте клиента: только позиция, без имени и телефона. */
export interface NearbyDriver {
  id: string;
  lat: number;
  lng: number;
}

export interface NearbyDriversQuery {
  regionId: string;
  lat: number;
  lng: number;
}

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
    getNearbyDrivers: build.query<NearbyDriver[], NearbyDriversQuery>({
      query: ({ regionId, lat, lng }) => ({
        url: '/geo/nearby-drivers',
        params: { regionId, lat, lng },
      }),
      keepUnusedDataFor: 30,
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
  useGetNearbyDriversQuery,
  useLazyGetDrivingRouteQuery,
  useLazyReverseGeocodeQuery,
  useLazySearchAddressesQuery,
  useReverseGeocodeQuery,
  useSearchAddressesQuery,
} = geoApi;

/** Сервер требует минимум 2 символа — не тратим запрос впустую. */
export const MIN_GEO_QUERY_LENGTH = 2;
