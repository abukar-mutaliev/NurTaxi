import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type {
  City,
  CreateCityDto,
  CreateRegionDto,
  DriverRequirementCatalog,
  Region,
  UpdateCityDto,
  UpdateRegionDto,
} from '../model/types';

export const regionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRegions: build.query<Region[], { includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/admin/regions',
        params: params?.includeInactive ? { includeInactive: 'true' } : undefined,
      }),
      providesTags: [API_TAGS.Region],
    }),
    /**
     * Справочник требований к анкете водителя. Приходит с бэкенда, поэтому новое
     * требование появляется в форме региона без правок админ-панели.
     */
    getDriverRequirementCatalog: build.query<DriverRequirementCatalog, void>({
      query: () => '/admin/regions/driver-requirements',
    }),
    getRegion: build.query<Region, string>({
      query: (id) => `/admin/regions/${id}`,
      providesTags: (_r, _e, id) => [{ type: API_TAGS.Region, id }],
    }),
    createRegion: build.mutation<Region, CreateRegionDto>({
      query: (body) => ({ url: '/admin/regions', method: 'POST', body }),
      invalidatesTags: [API_TAGS.Region],
    }),
    updateRegion: build.mutation<Region, { id: string; body: UpdateRegionDto }>({
      query: ({ id, body }) => ({ url: `/admin/regions/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [API_TAGS.Region, { type: API_TAGS.Region, id }],
    }),
    listCities: build.query<City[], { regionId: string; includeInactive?: boolean }>({
      query: ({ regionId, includeInactive }) => ({
        url: `/admin/regions/${regionId}/cities`,
        params: includeInactive ? { includeInactive: 'true' } : undefined,
      }),
      providesTags: (_r, _e, { regionId }) => [{ type: API_TAGS.City, id: regionId }],
    }),
    createCity: build.mutation<City, { regionId: string; body: CreateCityDto }>({
      query: ({ regionId, body }) => ({
        url: `/admin/regions/${regionId}/cities`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { regionId }) => [{ type: API_TAGS.City, id: regionId }],
    }),
    updateCity: build.mutation<City, { regionId: string; cityId: string; body: UpdateCityDto }>({
      query: ({ regionId, cityId, body }) => ({
        url: `/admin/regions/${regionId}/cities/${cityId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { regionId }) => [{ type: API_TAGS.City, id: regionId }],
    }),
  }),
});

export const {
  useListRegionsQuery,
  useGetRegionQuery,
  useGetDriverRequirementCatalogQuery,
  useCreateRegionMutation,
  useUpdateRegionMutation,
  useListCitiesQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
} = regionApi;
