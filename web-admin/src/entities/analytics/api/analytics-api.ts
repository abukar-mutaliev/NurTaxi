import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type {
  AdminAnalyticsSummary,
  AdminReportRow,
  AdminReportType,
  AnalyticsQueryParams,
} from '../model/types';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSummary: build.query<AdminAnalyticsSummary, AnalyticsQueryParams | void>({
      query: (params) => ({
        url: '/admin/analytics',
        params: params ?? undefined,
      }),
      providesTags: [API_TAGS.Analytics],
    }),
    getReport: build.query<
      AdminReportRow[],
      { type: AdminReportType } & AnalyticsQueryParams
    >({
      query: ({ type, ...params }) => ({
        url: `/admin/analytics/reports/${type}`,
        params,
      }),
    }),
  }),
});

export const { useGetSummaryQuery, useLazyGetReportQuery } = analyticsApi;
