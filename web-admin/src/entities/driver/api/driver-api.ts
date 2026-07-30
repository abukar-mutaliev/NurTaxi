import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { VerificationStatus } from '@/shared/model/enums';
import type { DriverProfile, ModerateDocumentDto, UpdateDriverDto } from '../model/types';

export const driverApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listDrivers: build.query<
      DriverProfile[],
      { verificationStatus?: VerificationStatus; regionId?: string } | void
    >({
      query: (params) => ({
        url: '/admin/drivers',
        params: params ?? undefined,
      }),
      providesTags: [API_TAGS.Driver],
    }),
    getDriver: build.query<DriverProfile, string>({
      query: (id) => `/admin/drivers/${id}`,
      providesTags: (_r, _e, id) => [{ type: API_TAGS.Driver, id }],
    }),
    moderateDocument: build.mutation<
      unknown,
      { driverId: string; documentId: string; body: ModerateDocumentDto }
    >({
      query: ({ driverId, documentId, body }) => ({
        url: `/admin/drivers/${driverId}/documents/${documentId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [API_TAGS.Driver],
    }),
    blockDriver: build.mutation<DriverProfile, { id: string; status: 'active' | 'blocked' }>({
      query: ({ id, status }) => ({
        url: `/admin/drivers/${id}/block`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: [API_TAGS.Driver],
    }),
    updateDriver: build.mutation<DriverProfile, { id: string; body: UpdateDriverDto }>({
      query: ({ id, body }) => ({
        url: `/admin/drivers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [API_TAGS.Driver],
    }),
    approveDriver: build.mutation<DriverProfile, string>({
      query: (id) => ({
        url: `/admin/drivers/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: [API_TAGS.Driver],
    }),
    deleteDriver: build.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/admin/drivers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [API_TAGS.Driver],
    }),
  }),
});

export const {
  useListDriversQuery,
  useGetDriverQuery,
  useModerateDocumentMutation,
  useBlockDriverMutation,
  useUpdateDriverMutation,
  useApproveDriverMutation,
  useDeleteDriverMutation,
} = driverApi;
