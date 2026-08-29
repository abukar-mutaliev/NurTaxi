import {
  getNotificationTemplate,
  getOrderStatusLabelRu,
  isChannelEnabled,
} from './notification-templates';

describe('notification-templates', () => {
  it('returns template for order.driver_assigned', () => {
    expect(getNotificationTemplate('order.driver_assigned')?.type).toBe('order.driver_assigned');
  });

  it('переводит статус заказа на понятный русский', () => {
    expect(getOrderStatusLabelRu('searching_driver')).toBe('Ищем водителя');
    expect(getOrderStatusLabelRu('driver_en_route')).toBe('Водитель едет к вам');
    expect(getOrderStatusLabelRu('unknown_status')).toBe('Статус поездки обновлён');
  });

  it('respects user notification settings', () => {
    expect(isChannelEnabled({ push: false, sms: true, email: false }, 'push')).toBe(false);
    expect(isChannelEnabled({ push: true, sms: true, email: false }, 'in_app')).toBe(true);
  });
});
