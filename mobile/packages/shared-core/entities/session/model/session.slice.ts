/**
 * Состояние сессии (M1.1).
 *
 * Сами токены здесь не хранятся — только в `tokenStorage` (SecureStore), см. `§20`.
 * В Redux лежит производная информация: авторизован ли пользователь, его роль, профиль
 * и признак необходимости дать согласие на обработку ПДн.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { sessionUnauthorized } from '@nurtaxi/shared-core/shared/api';
import { tokenStorage } from '@nurtaxi/shared-core/shared/lib';
import type { OtpVerifyResponse, Role, UserProfile } from '@nurtaxi/shared-core/shared/model';

/**
 * `unknown` — приложение ещё не прочитало SecureStore. Навигация в этом состоянии показывает
 * splash, иначе гость на мгновение увидит экран входа (`M1.8`).
 */
export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

export interface SessionState {
  status: SessionStatus;
  user: UserProfile | null;
  /** Требуется онбординг: нет имени либо не дано согласие 152-ФЗ. */
  requiresConsent: boolean;
  /** Телефон, на который отправлен OTP, — нужен экрану ввода кода. */
  pendingPhone: string | null;
  /** Только для dev-окружения: код из ответа сервера. */
  devCode: string | null;
}

const initialState: SessionState = {
  status: 'unknown',
  user: null,
  requiresConsent: false,
  pendingPhone: null,
  devCode: null,
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /** Результат чтения SecureStore при старте приложения. */
    sessionRestored(state, action: PayloadAction<{ hasTokens: boolean }>) {
      state.status = action.payload.hasTokens ? 'authenticated' : 'anonymous';
    },
    otpRequested(state, action: PayloadAction<{ phone: string; devCode?: string }>) {
      state.pendingPhone = action.payload.phone;
      state.devCode = action.payload.devCode ?? null;
    },
    signedIn(state, action: PayloadAction<OtpVerifyResponse>) {
      state.status = 'authenticated';
      state.user = action.payload.user;
      state.requiresConsent = action.payload.requiresConsent || !action.payload.user.name;
      state.devCode = null;
    },
    profileLoaded(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
      state.status = 'authenticated';
      state.requiresConsent = !action.payload.pdnConsentGiven || !action.payload.name;
    },
    onboardingCompleted(state) {
      state.requiresConsent = false;
    },
    signedOut() {
      return { ...initialState, status: 'anonymous' as const };
    },
  },
  extraReducers: (builder) => {
    // Refresh не удался — токены уже очищены в `baseQueryWithReauth`.
    builder.addCase(sessionUnauthorized, () => ({ ...initialState, status: 'anonymous' as const }));
  },
});

export const {
  sessionRestored,
  otpRequested,
  signedIn,
  profileLoaded,
  onboardingCompleted,
  signedOut,
} = sessionSlice.actions;

export const sessionReducer = sessionSlice.reducer;

/** Читает SecureStore и переводит сессию из `unknown` в конечное состояние. */
export async function restoreSession(): Promise<{ hasTokens: boolean }> {
  const tokens = await tokenStorage.restore();
  return { hasTokens: tokens !== null };
}

export interface WithSessionState {
  session: SessionState;
}

export const selectSessionStatus = (state: WithSessionState): SessionStatus => state.session.status;
export const selectIsAuthenticated = (state: WithSessionState): boolean =>
  state.session.status === 'authenticated';
export const selectIsSessionResolved = (state: WithSessionState): boolean =>
  state.session.status !== 'unknown';
export const selectCurrentUser = (state: WithSessionState): UserProfile | null => state.session.user;
export const selectUserRole = (state: WithSessionState): Role | null =>
  state.session.user?.role ?? null;
export const selectRequiresOnboarding = (state: WithSessionState): boolean =>
  state.session.status === 'authenticated' && state.session.requiresConsent;
export const selectPendingPhone = (state: WithSessionState): string | null =>
  state.session.pendingPhone;
export const selectDevCode = (state: WithSessionState): string | null => state.session.devCode;
