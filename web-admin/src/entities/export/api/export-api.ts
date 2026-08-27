import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';

export interface RegulatoryExport {
  id: string;
  legalBasis: string;
  requestRef: string;
  periodFrom: string;
  periodTo: string;
  format: string;
  status: string;
  checksum: string | null;
  rowCount: number | null;
  createdAt: string;
}

export const exportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listExports: build.query<RegulatoryExport[], { regionId?: string } | void>({
      query: (params) => ({ url: '/admin/exports', params: params ?? undefined }),
      providesTags: [API_TAGS.Export],
    }),
    createExport: build.mutation<
      RegulatoryExport,
      {
        legalBasis: string;
        requestRef: string;
        periodFrom: string;
        periodTo: string;
        dateField?: string;
        regionId?: string;
        format?: string;
      }
    >({
      query: (body) => ({ url: '/admin/exports', method: 'POST', body }),
      invalidatesTags: [API_TAGS.Export],
    }),
    getExportDownload: build.query<{ downloadUrl: string; checksum: string | null }, string>({
      query: (id) => `/admin/exports/${id}/download`,
    }),
  }),
});

export const { useListExportsQuery, useCreateExportMutation, useLazyGetExportDownloadQuery } = exportApi;
