/**
 * Deep-link маршруты из push/in-app уведомлений (M10.2, Req §23).
 *
 * Возвращает обычную строку или pathname, а не `Href` Expo Router: у водителя
 * нет клиентских маршрутов, и типизированный `Href` валит сборку его приложения.
 */
export type NotificationHref = string | { pathname: string; params?: Record<string, string> };

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
): NotificationHref | null {
  const orderId = readString(data, 'orderId', 'order_id');
  // Push с сервера несёт только eventId (FZ-02.4), без type и orderId.
  const eventType = type ?? readString(data, 'type', 'eventType', 'eventId') ?? '';

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
