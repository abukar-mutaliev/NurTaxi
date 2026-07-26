/** Любимые адреса — `/me/addresses` (M3.6, `§8.5`). Ограничения на количество нет. */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  CreateSavedAddressPayload,
  SavedAddress,
  SuccessResponse,
} from '@nurtaxi/shared-core/shared/model';

export const savedAddressApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSavedAddresses: build.query<SavedAddress[], void>({
      query: () => '/me/addresses',
      providesTags: ['SavedAddress'],
    }),

    createSavedAddress: build.mutation<SavedAddress, CreateSavedAddressPayload>({
      query: (body) => ({ url: '/me/addresses', method: 'POST', body }),
      invalidatesTags: ['SavedAddress'],
    }),

    deleteSavedAddress: build.mutation<SuccessResponse, string>({
      query: (id) => ({ url: `/me/addresses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SavedAddress'],
    }),
  }),
});

export const {
  useGetSavedAddressesQuery,
  useCreateSavedAddressMutation,
  useDeleteSavedAddressMutation,
} = savedAddressApi;
