/**
 * Аутентификация по OTP — `/auth/*` (M1.2, M1.3, M1.6, `§8.1`, `§14.1`).
 *
 * `refresh` здесь описан для полноты контракта, но в обычном потоке не вызывается вручную:
 * тихое обновление токена делает `baseQueryWithReauth` в `shared/api` (`M1.5`).
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  LogoutPayload,
  OtpRequestPayload,
  OtpRequestResponse,
  OtpVerifyPayload,
  OtpVerifyResponse,
  RefreshPayload,
  RefreshResponse,
  SuccessResponse,
} from '@nurtaxi/shared-core/shared/model';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    requestOtp: build.mutation<OtpRequestResponse, OtpRequestPayload>({
      query: (body) => ({ url: '/auth/otp/request', method: 'POST', body }),
    }),

    verifyOtp: build.mutation<OtpVerifyResponse, OtpVerifyPayload>({
      query: (body) => ({ url: '/auth/otp/verify', method: 'POST', body }),
      invalidatesTags: ['Profile', 'DriverProfile'],
    }),

    refreshTokens: build.mutation<RefreshResponse, RefreshPayload>({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', body }),
    }),

    logout: build.mutation<SuccessResponse, LogoutPayload>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),
  }),
});

export const {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useRefreshTokensMutation,
  useLogoutMutation,
} = authApi;
