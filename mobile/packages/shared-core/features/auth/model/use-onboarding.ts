/**
 * Онбординг после первой регистрации (M1.7, `§8.1`, `§8.3`).
 *
 * Сохраняет имя и опциональное фото, затем фиксирует согласие на обработку персональных
 * данных (152-ФЗ). Порядок важен: без согласия сервер продолжает помечать профиль как
 * требующий онбординга.
 */
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { toAppError, type AppError } from '@nurtaxi/shared-core/shared/api';
import { onboardingCompleted, profileLoaded } from '@nurtaxi/shared-core/entities/session';
import { useGiveConsentMutation, useUpdateMeMutation } from '@nurtaxi/shared-core/entities/user';

export const PDN_CONSENT_VERSION = '1.0';

export interface CompleteOnboardingInput {
  name: string;
  photoUrl?: string;
}

export interface OnboardingActions {
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
  isSubmitting: boolean;
  error: AppError | null;
}

export function useOnboarding(): OnboardingActions {
  const dispatch = useDispatch();
  const [updateMe, updateState] = useUpdateMeMutation();
  const [giveConsent, consentState] = useGiveConsentMutation();

  const completeOnboarding = useCallback(
    async ({ name, photoUrl }: CompleteOnboardingInput) => {
      await updateMe(photoUrl ? { name, photoUrl } : { name }).unwrap();
      const profile = await giveConsent({
        accepted: true,
        version: PDN_CONSENT_VERSION,
      }).unwrap();

      dispatch(profileLoaded(profile));
      dispatch(onboardingCompleted());
    },
    [dispatch, giveConsent, updateMe],
  );

  const error = updateState.error ?? consentState.error;

  return {
    completeOnboarding,
    isSubmitting: updateState.isLoading || consentState.isLoading,
    error: error ? toAppError(error) : null,
  };
}
