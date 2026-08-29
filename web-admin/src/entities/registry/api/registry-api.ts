import { baseApi } from '@/shared/api';

export interface RegistryCheck {
  id: string;
  subjectType: string;
  subjectId: string;
  verdict: string;
  source: string;
  checkedAt: string;
  validUntil: string | null;
  response?: Record<string, unknown>;
}

export const registryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRegistryChecks: build.query<RegistryCheck[], { subjectType: string; subjectId: string }>({
      query: ({ subjectType, subjectId }) => `/admin/registry-checks/${subjectType}/${subjectId}`,
    }),
  }),
});

export const { useListRegistryChecksQuery } = registryApi;
