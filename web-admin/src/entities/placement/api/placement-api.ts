import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';

export interface PlacementSite {
  id: string;
  name: string;
  operator: string;
  address: string;
  regionCode: string;
  purpose: string;
  contractRef: string | null;
  periodFrom: string;
  periodTo: string | null;
  isActive: boolean;
  components?: Array<{ componentKey: string }>;
}

export const placementApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listSites: build.query<PlacementSite[], void>({
      query: () => '/admin/placement-sites',
      providesTags: [API_TAGS.Placement],
    }),
    exportSites: build.query<unknown, void>({
      query: () => '/admin/placement-sites/export',
    }),
    createSite: build.mutation<PlacementSite, Record<string, unknown>>({
      query: (body) => ({ url: '/admin/placement-sites', method: 'POST', body }),
      invalidatesTags: [API_TAGS.Placement],
    }),
  }),
});

export const { useListSitesQuery, useLazyExportSitesQuery, useCreateSiteMutation } = placementApi;
