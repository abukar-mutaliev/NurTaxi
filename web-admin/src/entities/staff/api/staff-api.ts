import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { UserStatus } from '@/shared/model/enums';
import type { AssignStaffDto, StaffMember } from '../model/types';

export const staffApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listStaff: build.query<StaffMember[], { regionId?: string } | void>({
      query: (params) => ({
        url: '/admin/staff',
        params: params?.regionId ? { regionId: params.regionId } : undefined,
      }),
      providesTags: [API_TAGS.Staff],
    }),
    assignStaff: build.mutation<StaffMember, AssignStaffDto>({
      query: (body) => ({ url: '/admin/staff/assign', method: 'POST', body }),
      invalidatesTags: [API_TAGS.Staff],
    }),
    revokeStaff: build.mutation<StaffMember, string>({
      query: (id) => ({ url: `/admin/staff/${id}/revoke`, method: 'PATCH' }),
      invalidatesTags: [API_TAGS.Staff],
    }),
    removeStaff: build.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/admin/staff/${id}`, method: 'DELETE' }),
      invalidatesTags: [API_TAGS.Staff],
    }),
    setStaffStatus: build.mutation<StaffMember, { id: string; status: UserStatus }>({
      query: ({ id, status }) => ({
        url: `/admin/staff/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: [API_TAGS.Staff],
    }),
  }),
});

export const {
  useListStaffQuery,
  useAssignStaffMutation,
  useRevokeStaffMutation,
  useRemoveStaffMutation,
  useSetStaffStatusMutation,
} = staffApi;
