import { baseApi } from '@/shared/api';
import { API_TAGS } from '@/shared/api/tags';
import type { AuthResult, OtpRequestResponse, OtpStatusResponse, TokenPair, User } from '../model/types';

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    requestOtp: build.mutation<OtpRequestResponse, { phone: string }>({
      query: (body) => ({ url: '/auth/otp/request', method: 'POST', body }),
    }),
    verifyOtp: build.mutation<AuthResult, { phone: string; code: string }>({
      query: (body) => ({ url: '/auth/otp/verify', method: 'POST', body }),
    }),
    otpStatus: build.mutation<OtpStatusResponse, { phone: string }>({
      query: (body) => ({ url: '/auth/otp/status', method: 'POST', body }),
    }),
    refresh: build.mutation<TokenPair, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', body }),
    }),
    logout: build.mutation<{ success: boolean }, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),
    getMe: build.query<User, void>({
      query: () => '/me',
      providesTags: [API_TAGS.User],
    }),
  }),
});

export const {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useOtpStatusMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
} = userApi;
