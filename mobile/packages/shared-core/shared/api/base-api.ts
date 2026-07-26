/**
 * Базовый API-слой на RTK Query (M0.5, M1.5).
 *
 * Отвечает за:
 *  - `baseUrl` из конфигурации окружения (`/api/v1`);
 *  - подстановку `Authorization: Bearer <accessToken>` из защищённого хранилища;
 *  - заголовок `Idempotency-Key` на всех мутациях (`requirements.md §14.5`);
 *  - тихое обновление токена при `401`: один параллельный refresh на всё приложение,
 *    остальные запросы ждут его результата и повторяются автоматически.
 *
 * Конкретные эндпоинты добавляются через `baseApi.injectEndpoints` в слое `entities`.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query';

import { appConfig } from '../config';
import { tokenStorage } from '../lib/storage';
import type { RefreshResponse } from '../model/api-types';
import { createIdempotencyKey } from './idempotency';
import { sessionTokensRefreshed, sessionUnauthorized } from './session-events';
import { API_TAGS } from './tags';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const rawBaseQuery = fetchBaseQuery({
  baseUrl: appConfig.apiUrl,
  timeout: appConfig.requestTimeoutMs,
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

/** Гарантирует, что одновременно выполняется не больше одного refresh-запроса. */
let refreshInFlight: Promise<boolean> | null = null;

type RawBaseQuery = typeof rawBaseQuery;

async function refreshTokens(
  api: Parameters<RawBaseQuery>[1],
  extraOptions: Parameters<RawBaseQuery>[2],
): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const result = await rawBaseQuery(
    { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
    api,
    extraOptions,
  );

  if (result.error || !result.data) {
    return false;
  }

  const tokens = result.data as RefreshResponse;
  await tokenStorage.save({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
  api.dispatch(sessionTokensRefreshed(tokens));
  return true;
}

/** Эндпоинты авторизации не нуждаются в повторе после refresh — там 401 означает неверный код. */
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

  const isMutation =
    typeof args !== 'string' && args.method ? MUTATION_METHODS.has(args.method) : false;
  if (appConfig.debugNetwork) {
    const url = typeof args === 'string' ? args : args.url;
    console.warn(`[api] ${isMutation ? 'mutation' : 'query'} ${url}`, result.error ?? 'ok');
  }

  if (result.error?.status !== 401 || isAuthEndpoint(args)) {
    return result;
  }

  refreshInFlight ??= refreshTokens(api, extraOptions).finally(() => {
    refreshInFlight = null;
  });
  const refreshed = await refreshInFlight;

  if (!refreshed) {
    await tokenStorage.clear();
    api.dispatch(sessionUnauthorized());
    return result;
  }

  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: API_TAGS,
  /** Заказ и позиция водителя обновляются через WebSocket, кэш живёт недолго. */
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});

export { rawBaseQuery };
