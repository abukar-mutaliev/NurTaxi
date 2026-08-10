import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { Complaint } from '../model/types';

export const complaintApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listComplaints: build.query<Complaint[], { regionId?: string } | void>({
      query: (params) => ({
        url: '/admin/complaints',
        params: params?.regionId ? { regionId: params.regionId } : undefined,
      }),
      providesTags: [API_TAGS.Complaint],
    }),
  }),
});

export const { useListComplaintsQuery } = complaintApi;
