import type { NotificationHref } from '@nurtaxi/shared-core/features/notifications/model/notification-router';

function readString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

/**
 * Куда открыть водительское приложение по push.
 * Общий роутер знает клиентские экраны (`/profile/promo`, чек) — здесь их нет.
 */
export function resolveDriverNotificationHref(
  type: string | undefined,
  data: Record<string, unknown>,
): NotificationHref {
  const eventType = type ?? readString(data, 'type', 'eventType', 'eventId') ?? '';
  const orderId = readString(data, 'orderId', 'order_id');

  if (eventType.startsWith('document.')) {
    return '/(verification)/status';
  }

  if (eventType === 'promo.redeemed') {
    return '/(tabs)/earnings';
  }

  if (orderId && (eventType.startsWith('order.') || eventType.startsWith('payment.'))) {
    return { pathname: '/order/[id]', params: { id: orderId } };
  }

  return '/(tabs)';
}
