/**
 * Deep-link маршруты из push/in-app уведомлений (M10.2, Req §23).
 */
import type { Href } from 'expo-router';

function readString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

/** Преобразует payload уведомления в маршрут Expo Router. */
export function resolveNotificationHref(
  type: string | undefined,
  data: Record<string, unknown>,
): Href | null {
  const orderId = readString(data, 'orderId', 'order_id');
  const eventType = type ?? readString(data, 'type', 'eventType') ?? '';

  if (eventType === 'promo.redeemed') {
    return '/profile/promo';
  }

  if (eventType.startsWith('document.')) {
    return null;
  }

  if (orderId) {
    if (eventType === 'payment.completed') {
      return { pathname: '/trip/[id]/receipt', params: { id: orderId } };
    }
    return { pathname: '/order/[id]', params: { id: orderId } };
  }

  if (eventType.startsWith('order.') || eventType.startsWith('payment.')) {
    return '/(tabs)';
  }

  return '/profile/notifications';
}
