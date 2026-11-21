import type { PushMessage } from './push-provider.interface';

/** Формат Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/ */
export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: 'default';
  priority: 'high';
  channelId: 'orders' | 'promo';
  ttl?: number;
}

export function isExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

/**
 * Сообщение для Expo. Заголовок и текст — готовые шаблоны без ФИО, телефона и адреса.
 * В `data` остаётся только то, что уже отдал `sanitizePushData`.
 */
export function buildExpoPushMessage(token: string, message: PushMessage): ExpoPushMessage {
  const eventId = message.data?.eventId;
  const channelId = message.channelId ?? (eventId?.startsWith('promo.') ? 'promo' : 'orders');

  return {
    to: token,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    sound: 'default',
    priority: 'high',
    channelId,
    ...(message.ttlSeconds != null ? { ttl: message.ttlSeconds } : {}),
  };
}
