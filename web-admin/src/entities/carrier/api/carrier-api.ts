import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';

export interface Carrier {
  id: string;
  name: string;
  legalForm: string;
  inn: string;
  ogrn: string;
  address: string;
  phone: string | null;
  email: string | null;
  regionId: string;
  status: string;
}

export const carrierApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCarriers: build.query<Carrier[], { regionId?: string } | void>({
      query: (params) => ({ url: '/admin/carriers', params: params ?? undefined }),
      providesTags: [API_TAGS.Carrier],
    }),
    getCarrier: build.query<Carrier, string>({
      query: (id) => `/admin/carriers/${id}`,
      providesTags: (_r, _e, id) => [{ type: API_TAGS.Carrier, id }],
    }),
    listExpiringPermits: build.query<unknown[], { regionId?: string } | void>({
      query: (params) => ({ url: '/admin/carriers/permits/expiring', params: params ?? undefined }),
      providesTags: [API_TAGS.Carrier],
    }),
    createCarrier: build.mutation<Carrier, Partial<Carrier>>({
      query: (body) => ({ url: '/admin/carriers', method: 'POST', body }),
      invalidatesTags: [API_TAGS.Carrier],
    }),
  }),
});

export const { useListCarriersQuery, useGetCarrierQuery, useListExpiringPermitsQuery, useCreateCarrierMutation } =
  carrierApi;
