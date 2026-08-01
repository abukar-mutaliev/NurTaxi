/**
 * Настройки уведомлений и приватности (M2.3, M10.1).
 */
import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { NotificationSettings, PrivacySettings } from '@nurtaxi/shared-core/shared/model';
import { useGetMeQuery } from '@nurtaxi/shared-core/entities/user';
import { useRegisterPushTokenMutation } from '@nurtaxi/shared-core/entities/notification';
import {
  acquirePushToken,
  useNotificationPermission,
} from '@nurtaxi/shared-core/features/notifications';

import { useProfileUpdate } from '@/features/profile';
import { GlassCard, GlassScreenShell, GlassSectionLabel, SwitchRow } from '@/shared/ui';

export function SettingsScreen() {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useGetMeQuery();
  const { updateNotificationSetting, updatePrivacySetting } = useProfileUpdate();
  const notificationPermission = useNotificationPermission();
  const [registerPushToken] = useRegisterPushTokenMutation();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(
    null,
  );
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);

  // Локальное состояние заполняется из профиля один раз — дальше им владеет экран,
  // фоновый рефетч профиля не должен затирать несохранённые переключения. Обновляем
  // прямо при рендере, без лишнего эффекта.
  if (profile && notificationSettings === null) {
    setNotificationSettings(profile.notificationSettings);
  }
  if (profile && privacySettings === null) {
    setPrivacySettings(profile.privacySettings);
  }

  const toggleNotification = async (key: keyof NotificationSettings, value: boolean) => {
    if (!notificationSettings) {
      return;
    }

    const snapshot = notificationSettings;
    setNotificationSettings({ ...snapshot, [key]: value });

    try {
      await updateNotificationSetting(key, value);
    } catch {
      setNotificationSettings(snapshot);
      throw new Error('notification_setting_update_failed');
    }
  };

  const togglePrivacy = async (key: keyof PrivacySettings, value: boolean) => {
    if (!privacySettings) {
      return;
    }

    const snapshot = privacySettings;
    setPrivacySettings({ ...snapshot, [key]: value });

    try {
      await updatePrivacySetting(key, value);
    } catch {
      setPrivacySettings(snapshot);
      throw new Error('privacy_setting_update_failed');
    }
  };

  const handlePushToggle = async (value: boolean) => {
    if (!notificationSettings) {
      return;
    }

    if (value) {
      const granted =
        notificationPermission.state === 'granted' || (await notificationPermission.request());
      if (!granted) {
        Alert.alert(
          t('permissions.notificationsTitle'),
          t('permissions.notificationsDescription'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('permissions.openSettings'),
              onPress: () => {
                void notificationPermission.openSettings();
              },
            },
          ],
        );
        throw new Error('notifications_permission_denied');
      }

      const pushToken = await acquirePushToken();
      if (pushToken) {
        try {
          await registerPushToken({
            token: pushToken.token,
            platform: pushToken.platform,
          }).unwrap();
        } catch {
          // Сервер может быть недоступен — настройку всё равно сохраняем.
        }
      }
    }

    await toggleNotification('push', value);
  };

  if (isLoading || !profile || !notificationSettings || !privacySettings) {
    return <GlassScreenShell includeTabBarInset isLoading loadingLabel={t('common.loading')} />;
  }

  return (
    <GlassScreenShell includeTabBarInset title={t('profile.settingsTitle')}>
      <GlassCard>
        <GlassSectionLabel>{t('profile.notifications')}</GlassSectionLabel>
        <SwitchRow
          onValueChange={handlePushToggle}
          title={t('profile.pushNotifications')}
          value={notificationSettings.push}
        />
        <SwitchRow
          onValueChange={(value) => toggleNotification('sms', value)}
          title={t('profile.smsNotifications')}
          value={notificationSettings.sms}
        />
        <SwitchRow
          onValueChange={(value) => toggleNotification('email', value)}
          title={t('profile.emailNotifications')}
          value={notificationSettings.email}
        />
      </GlassCard>

      <GlassCard>
        <GlassSectionLabel>{t('profile.privacy')}</GlassSectionLabel>
        <SwitchRow
          onValueChange={(value) => togglePrivacy('shareTripWithFamily', value)}
          title={t('profile.shareTripWithFamily')}
          value={privacySettings.shareTripWithFamily}
        />
        <SwitchRow
          onValueChange={(value) => togglePrivacy('showProfilePhoto', value)}
          title={t('profile.showProfilePhoto')}
          value={privacySettings.showProfilePhoto}
        />
      </GlassCard>
    </GlassScreenShell>
  );
}
