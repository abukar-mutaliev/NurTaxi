/**
 * Android-каналы push-уведомлений (M10.1).
 * Канал `orders` совпадает с `defaultChannel` в app.config.ts.
 */
import { Platform } from 'react-native';

import { brandColors } from '@nurtaxi/shared-core/shared/ui';

import { loadExpoNotifications } from './expo-notifications-runtime';

export async function ensurePushChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const Notifications = await loadExpoNotifications();
  if (!Notifications) {
    return;
  }

  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Заказы',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: brandColors.primary,
  });

  await Notifications.setNotificationChannelAsync('promo', {
    name: 'Акции и бонусы',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: brandColors.primary,
  });
}
