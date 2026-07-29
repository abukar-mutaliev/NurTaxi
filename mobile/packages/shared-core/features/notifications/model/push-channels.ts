/**
 * Android-каналы push-уведомлений (M10.1).
 * Канал `orders` совпадает с `defaultChannel` в app.config.ts.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function ensurePushChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Заказы',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B6B5A',
  });

  await Notifications.setNotificationChannelAsync('promo', {
    name: 'Акции и бонусы',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#1B6B5A',
  });
}
