/**
 * Основной сценарий входа (M1.2–M1.6).
 *
 * Хук инкапсулирует последовательность «запросить код → подтвердить → сохранить токены →
 * обновить состояние сессии» и симметричный выход. Экраны не работают с `tokenStorage`
 * напрямую — это единственная точка, где токены попадают в SecureStore.
 */
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { baseApi, toAppError, type AppError } from '@nurtaxi/shared-core/shared/api';
import { normalizePhone, tokenStorage } from '@nurtaxi/shared-core/shared/lib';
import type {
  OtpRequestResponse,
  OtpStatusResponse,
  OtpVerifyResponse,
} from '@nurtaxi/shared-core/shared/model';
import {
  challengeUpdated,
  otpRequested,
  signedIn,
  signedOut,
} from '@nurtaxi/shared-core/entities/session';

import {
  useLogoutMutation,
  useOtpStatusMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
} from '../api/auth.api';

export interface AuthActions {
  requestOtp: (phone: string) => Promise<OtpRequestResponse>;
  verifyOtp: (phone: string, code: string) => Promise<OtpVerifyResponse>;
  /** Опрос Mobile ID. При подтверждении на телефоне сразу сохраняет токены. */
  pollOtpStatus: (phone: string) => Promise<OtpStatusResponse>;
  logout: () => Promise<void>;
  isRequestingOtp: boolean;
  isVerifyingOtp: boolean;
  requestError: AppError | null;
  verifyError: AppError | null;
}

export function useAuth(): AuthActions {
  const dispatch = useDispatch();
  const [requestOtpMutation, requestState] = useRequestOtpMutation();
  const [verifyOtpMutation, verifyState] = useVerifyOtpMutation();
  const [otpStatusMutation] = useOtpStatusMutation();
  const [logoutMutation] = useLogoutMutation();

  const requestOtp = useCallback(
    async (rawPhone: string) => {
      const phone = normalizePhone(rawPhone);
      const result = await requestOtpMutation({ phone }).unwrap();
      dispatch(
        otpRequested({
          phone,
          devCode: result.devCode,
          method: result.method,
          status: result.status,
        }),
      );
      return result;
    },
    [dispatch, requestOtpMutation],
  );

  const verifyOtp = useCallback(
    async (rawPhone: string, code: string) => {
      const phone = normalizePhone(rawPhone);
      const result = await verifyOtpMutation({ phone, code }).unwrap();
      await tokenStorage.save({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      dispatch(signedIn(result));
      return result;
    },
    [dispatch, verifyOtpMutation],
  );

  const pollOtpStatus = useCallback(
    async (rawPhone: string) => {
      const phone = normalizePhone(rawPhone);
      const result = await otpStatusMutation({ phone }).unwrap();
      if (result.accessToken && result.refreshToken && result.user) {
        await tokenStorage.save({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        dispatch(signedIn(result as OtpVerifyResponse));
        return result;
      }
      if (
        result.status === 'pending' ||
        result.status === 'otp_required' ||
        result.status === 'failed'
      ) {
        dispatch(challengeUpdated({ status: result.status }));
      }
      return result;
    },
    [dispatch, otpStatusMutation],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      // Отзыв refresh-токена на сервере не должен мешать локальному выходу.
      try {
        await logoutMutation({ refreshToken }).unwrap();
      } catch {
        // Игнорируем: токен всё равно удаляется локально.
      }
    }
    await tokenStorage.clear();
    dispatch(signedOut());
    dispatch(baseApi.util.resetApiState());
  }, [dispatch, logoutMutation]);

  return {
    requestOtp,
    verifyOtp,
    pollOtpStatus,
    logout,
    isRequestingOtp: requestState.isLoading,
    isVerifyingOtp: verifyState.isLoading,
    requestError: requestState.error ? toAppError(requestState.error) : null,
    verifyError: verifyState.error ? toAppError(verifyState.error) : null,
  };
}
