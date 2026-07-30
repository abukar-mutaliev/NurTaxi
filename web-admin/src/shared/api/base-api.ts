import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query';
import { appConfig } from '../config';
import { createIdempotencyKey } from '../lib/utils';
import { tokenStorage } from '../lib/token-storage';
import { API_TAGS } from './tags';
import { sessionUnauthorized, sessionTokensRefreshed } from '@/features/auth/model/session-events';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: appConfig.apiUrl,
  prepareHeaders: (headers, { type }) => {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (type === 'mutation' && !headers.has('Idempotency-Key')) {
      headers.set('Idempotency-Key', createIdempotencyKey());
    }
    return headers;
  },
});

let refreshInFlight: Promise<boolean> | null = null;

type RawBaseQuery = typeof rawBaseQuery;

async function refreshTokens(
  api: Parameters<RawBaseQuery>[1],
  extraOptions: Parameters<RawBaseQuery>[2],
): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  const result = await rawBaseQuery(
    { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
    api,
    extraOptions,
  );

  if (result.error || !result.data) return false;

  const tokens = result.data as { accessToken: string; refreshToken: string };
  tokenStorage.save(tokens);
  api.dispatch(sessionTokensRefreshed(tokens));
  return true;
}

function isAuthEndpoint(args: string | FetchArgs): boolean {
  const url = typeof args === 'string' ? args : args.url;
  return url.startsWith('/auth/');
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  Record<string, unknown>,
  FetchBaseQueryMeta
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401 || isAuthEndpoint(args)) {
    return result;
  }

  refreshInFlight ??= refreshTokens(api, extraOptions).finally(() => {
    refreshInFlight = null;
  });
  const refreshed = await refreshInFlight;

  if (!refreshed) {
    tokenStorage.clear();
    api.dispatch(sessionUnauthorized());
    return result;
  }

  return rawBaseQuery(args, api, extraOptions);
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: Object.values(API_TAGS),
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
