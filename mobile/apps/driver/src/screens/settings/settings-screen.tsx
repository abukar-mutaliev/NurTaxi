/**
 * Настройки водителя: уведомления и приватность (M2.3, M10.1).
 *
 * Набор переключателей и контракт с сервером те же, что и в приложении клиента
 * (`PATCH /me`), — настройки живут в общем профиле пользователя, а не в профиле водителя.
 * Отличается только оформление: здесь карточки водительского кита, а не «стекло» клиента.
 */
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import type { NotificationSettings, PrivacySettings } from '@nurtaxi/shared-core/shared/model';
import { Loader, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useGetMeQuery, useUpdateMeMutation } from '@nurtaxi/shared-core/entities/user';
import { useRegisterPushTokenMutation } from '@nurtaxi/shared-core/entities/notification';
/**
 * Импорт идёт мимо бочки `features/notifications`: она реэкспортирует
 * `notification-router`, а тот ссылается на маршруты клиентского приложения
 * (`/profile/promo`, `/trip/[id]/receipt`) — в типизированных маршрутах водителя их нет.
 */
import { acquirePushToken } from '@nurtaxi/shared-core/features/notifications/model/acquire-push-token';
import { useNotificationPermission } from '@nurtaxi/shared-core/features/notifications/model/use-notification-permission';

import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';
import { ScreenBackHeader } from '@/shared/ui/screen-back-header';
import { SwitchRow } from '@/shared/ui/switch-row';

export function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading } = useGetMeQuery();
  const [updateMe] = useUpdateMeMutation();
  const [registerPushToken] = useRegisterPushTokenMutation();
  const notificationPermission = useNotificationPermission();

  // Локальное состояние заполняется из профиля один раз — дальше им владеет экран,
  // фоновый рефетч профиля не должен затирать несохранённые переключения.
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (profile && notifications === null) {
    setNotifications(profile.notificationSettings);
  }
  if (profile && privacy === null) {
    setPrivacy(profile.privacySettings);
  }

  const toggleNotification = async (key: keyof NotificationSettings, value: boolean) => {
    if (!notifications) {
      return;
    }

    const snapshot = notifications;
    setNotifications({ ...snapshot, [key]: value });
    setError(null);

    try {
      await updateMe({ notificationSettings: { [key]: value } }).unwrap();
    } catch (cause) {
      setNotifications(snapshot);
      setError(toAppError(cause as never).message);
      throw cause;
    }
  };

  const togglePrivacy = async (key: keyof PrivacySettings, value: boolean) => {
    if (!privacy) {
      return;
    }

    const snapshot = privacy;
    setPrivacy({ ...snapshot, [key]: value });
    setError(null);

    try {
      await updateMe({ privacySettings: { [key]: value } }).unwrap();
    } catch (cause) {
      setPrivacy(snapshot);
      setError(toAppError(cause as never).message);
      throw cause;
    }
  };

  /**
   * Push нельзя включить одной галочкой: без системного разрешения и зарегистрированного
   * токена водитель просто не увидит входящий заказ, а настройка будет выглядеть включённой.
   */
  const handlePushToggle = async (value: boolean) => {
    if (value) {
      const granted =
        notificationPermission.state === 'granted' || (await notificationPermission.request());

      if (!granted) {
        Alert.alert(
          t('permissions.notificationsTitle'),
          t('permissions.notificationsDescription'),
          [
            { style: 'cancel', text: t('common.cancel') },
            {
              onPress: () => {
                void notificationPermission.openSettings();
              },
              text: t('permissions.openSettings'),
            },
          ],
        );
        throw new Error('notifications_permission_denied');
      }

      const pushToken = await acquirePushToken();
      if (pushToken) {
        try {
          await registerPushToken({
            platform: pushToken.platform,
            token: pushToken.token,
          }).unwrap();
        } catch {
          // Сервер может быть недоступен — саму настройку всё равно сохраняем.
        }
      }
    }

    await toggleNotification('push', value);
  };

  if (isLoading || !profile || !notifications || !privacy) {
    return (
      <View style={styles.root}>
        <ScreenGradientBackground tone="rose" />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGradientBackground tone="rose" />

      <ScrollView
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenBackHeader title={t('profile.settingsTitle')} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              gap: theme.spacing.xs,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Text tone="muted" variant="label">
            {t('profile.notifications')}
          </Text>
          <SwitchRow
            onValueChange={handlePushToggle}
            subtitle="Без них вы не увидите входящий заказ"
            title={t('profile.pushNotifications')}
            value={notifications.push}
          />
          <SwitchRow
            onValueChange={(value) => toggleNotification('sms', value)}
            title={t('profile.smsNotifications')}
            value={notifications.sms}
          />
          <SwitchRow
            onValueChange={(value) => toggleNotification('email', value)}
            title={t('profile.emailNotifications')}
            value={notifications.email}
          />
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              gap: theme.spacing.xs,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Text tone="muted" variant="label">
            {t('profile.privacy')}
          </Text>
          <SwitchRow
            onValueChange={(value) => togglePrivacy('showProfilePhoto', value)}
            subtitle="Пассажир увидит ваше фото в карточке поездки"
            title={t('profile.showProfilePhoto')}
            value={privacy.showProfilePhoto}
          />
        </View>

        {error ? (
          <Text tone="danger" variant="caption">
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    elevation: 1,
    shadowColor: 'rgba(89,71,31,0.07)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
});
