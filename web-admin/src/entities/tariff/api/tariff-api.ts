import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { CreateTariffDto, Tariff, UpdateTariffDto } from '../model/types';

export const tariffApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listTariffs: build.query<Tariff[], { regionId: string }>({
      query: ({ regionId }) => ({
        url: '/admin/tariffs',
        params: { regionId },
      }),
      providesTags: [API_TAGS.Tariff],
    }),
    createTariff: build.mutation<Tariff, CreateTariffDto>({
      query: (body) => ({ url: '/admin/tariffs', method: 'POST', body }),
      invalidatesTags: [API_TAGS.Tariff],
    }),
    updateTariff: build.mutation<Tariff, { id: string; body: UpdateTariffDto }>({
      query: ({ id, body }) => ({ url: `/admin/tariffs/${id}`, method: 'PATCH', body }),
      invalidatesTags: [API_TAGS.Tariff],
    }),
  }),
});

export const { useListTariffsQuery, useCreateTariffMutation, useUpdateTariffMutation } = tariffApi;
