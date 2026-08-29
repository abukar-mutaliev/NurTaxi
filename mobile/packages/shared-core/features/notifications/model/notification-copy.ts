import {
  formatOrderStatusLabel,
  ORDER_STATUS_LABELS_RU,
} from '@nurtaxi/shared-core/entities/order';
import type { AppNotification } from '@nurtaxi/shared-core/shared/model';

const RAW_STATUS_BODY = /^Новый статус:\s*([a-z_]+)$/i;

function readStoredStatus(notification: Pick<AppNotification, 'body' | 'data'>): string | null {
  const fromData = notification.data?.toStatus;
  if (typeof fromData === 'string' && fromData in ORDER_STATUS_LABELS_RU) {
    return fromData;
  }

  const match = notification.body.match(RAW_STATUS_BODY);
  if (match?.[1] && match[1] in ORDER_STATUS_LABELS_RU) {
    return match[1];
  }

  return null;
}

/** Подставляет понятный русский статус вместо сырого enum из ответа API. */
export function resolveNotificationCopy(
  notification: Pick<AppNotification, 'type' | 'title' | 'body' | 'data'>,
): { title: string; body: string } {
  const status = readStoredStatus(notification);
  if (!status) {
    return { title: notification.title, body: notification.body };
  }

  const body = formatOrderStatusLabel(status);
  if (notification.type === 'order.status_changed') {
    return { title: 'Статус поездки', body };
  }

  return { title: notification.title, body };
}
