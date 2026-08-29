import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { AuditLogListPage } from '../model/types';

export const auditApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAuditLogs: build.query<
      AuditLogListPage,
      {
        regionId?: string;
        resourceId?: string;
        actorId?: string;
        action?: string;
        from?: string;
        to?: string;
        limit?: number;
        cursor?: string;
      }
    >({
      query: (params) => ({
        url: '/admin/audit-logs',
        params,
      }),
      providesTags: [API_TAGS.Audit],
    }),
  }),
});

export const { useListAuditLogsQuery, useLazyListAuditLogsQuery } = auditApi;
