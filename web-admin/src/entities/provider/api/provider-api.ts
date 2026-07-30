import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { CreateProviderDto, ProviderConfig, UpdateProviderDto } from '../model/types';

export const providerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listProviders: build.query<ProviderConfig[], { regionId?: string } | void>({
      query: (params) => ({
        url: '/admin/providers',
        params: params?.regionId ? { regionId: params.regionId } : undefined,
      }),
      providesTags: [API_TAGS.Provider],
    }),
    createProvider: build.mutation<ProviderConfig, CreateProviderDto>({
      query: (body) => ({ url: '/admin/providers', method: 'POST', body }),
      invalidatesTags: [API_TAGS.Provider],
    }),
    updateProvider: build.mutation<ProviderConfig, { id: string; body: UpdateProviderDto }>({
      query: ({ id, body }) => ({ url: `/admin/providers/${id}`, method: 'PATCH', body }),
      invalidatesTags: [API_TAGS.Provider],
    }),
  }),
});

export const {
  useListProvidersQuery,
  useCreateProviderMutation,
  useUpdateProviderMutation,
} = providerApi;
