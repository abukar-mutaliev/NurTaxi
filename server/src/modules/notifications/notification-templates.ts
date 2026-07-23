import type { NotificationSettings } from '../users/entities/user.entity';

export interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
  /** Какие каналы разрешены шаблоном (фильтруются настройками пользователя). */
  channels: Array<'push' | 'sms' | 'in_app'>;
}

const templates: Record<string, NotificationTemplate> = {
  'order.driver_assigned': {
    type: 'order.driver_assigned',
    title: 'Водитель назначен',
    body: 'Водитель принял ваш заказ и едет к вам',
    channels: ['push', 'in_app'],
  },
  'order.status_changed': {
    type: 'order.status_changed',
    title: 'Статус поездки',
    body: 'Статус вашего заказа изменился',
    channels: ['push', 'in_app'],
  },
  'order.cancelled': {
    type: 'order.cancelled',
    title: 'Заказ отменён',
    body: 'Ваш заказ был отменён',
    channels: ['push', 'sms', 'in_app'],
  },
  'payment.completed': {
    type: 'payment.completed',
    title: 'Оплата прошла',
    body: 'Поездка оплачена, чек доступен в приложении',
    channels: ['push', 'in_app'],
  },
  'payment.failed': {
    type: 'payment.failed',
    title: 'Ошибка оплаты',
    body: 'Не удалось списать оплату, мы повторим попытку',
    channels: ['push', 'sms', 'in_app'],
  },
  'document.verified': {
    type: 'document.verified',
    title: 'Документы проверены',
    body: 'Статус верификации документов обновлён',
    channels: ['push', 'in_app'],
  },
  'promo.redeemed': {
    type: 'promo.redeemed',
    title: 'Промокод применён',
    body: 'Бонусный баланс пополнен',
    channels: ['push', 'in_app'],
  },
};

export function getNotificationTemplate(eventType: string): NotificationTemplate | null {
  return templates[eventType] ?? null;
}

export function isChannelEnabled(
  settings: NotificationSettings,
  channel: 'push' | 'sms' | 'in_app',
): boolean {
  if (channel === 'in_app') return true;
  if (channel === 'push') return settings.push !== false;
  if (channel === 'sms') return settings.sms !== false;
  return true;
}
