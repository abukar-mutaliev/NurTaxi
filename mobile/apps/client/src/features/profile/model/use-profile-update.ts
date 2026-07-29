/**
 * Обновление профиля клиента (M2.2–M2.6): PATCH /me + синхронизация языка i18n.
 */
import { useCallback } from 'react';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { changeLanguage, SUPPORTED_LANGUAGES } from '@nurtaxi/shared-core/shared/i18n';
import type {
  AppLanguage,
  NotificationSettings,
  PrivacySettings,
  UpdateProfilePayload,
} from '@nurtaxi/shared-core/shared/model';
import { useUpdateMeMutation } from '@nurtaxi/shared-core/entities/user';

function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function useProfileUpdate() {
  const [updateMe, state] = useUpdateMeMutation();

  const updateProfile = useCallback(
    async (patch: UpdateProfilePayload) => {
      const result = await updateMe(patch).unwrap();
      if (patch.language && isSupportedLanguage(patch.language)) {
        await changeLanguage(patch.language);
      }
      return result;
    },
    [updateMe],
  );

  const updateNotificationSetting = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      return updateProfile({ notificationSettings: { [key]: value } });
    },
    [updateProfile],
  );

  const updatePrivacySetting = useCallback(
    async (key: keyof PrivacySettings, value: boolean) => {
      return updateProfile({ privacySettings: { [key]: value } });
    },
    [updateProfile],
  );

  return {
    updateProfile,
    updateNotificationSetting,
    updatePrivacySetting,
    isUpdating: state.isLoading,
    error: state.error ? toAppError(state.error) : null,
  };
}

export type ProfileUpdateActions = ReturnType<typeof useProfileUpdate>;
