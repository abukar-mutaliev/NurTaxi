/**
 * Регионы и города — публичные `GET /regions`, `GET /regions/{id}/cities` (`§6.3`).
 * Feature-флаги региона включают промокоды, семейный аккаунт и прочие опции без деплоя.
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type { City, Region } from '@nurtaxi/shared-core/shared/model';

export const regionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRegions: build.query<Region[], void>({
      query: () => '/regions',
      providesTags: ['Region'],
      // Справочник меняется редко — держим в кэше до перезапуска приложения.
      keepUnusedDataFor: 3600,
    }),

    getCities: build.query<City[], string>({
      query: (regionId) => `/regions/${regionId}/cities`,
      providesTags: ['City'],
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useGetRegionsQuery, useGetCitiesQuery } = regionApi;

/** Проверка feature-флага региона (`design.md §4.2`). */
export function isFeatureEnabled(region: Region | undefined, flag: string): boolean {
  return region?.featureFlags?.[flag] === true;
}
