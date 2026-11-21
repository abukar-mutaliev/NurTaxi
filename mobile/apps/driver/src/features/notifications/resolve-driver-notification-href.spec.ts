import { resolveDriverNotificationHref } from './resolve-driver-notification-href';

describe('resolveDriverNotificationHref', () => {
  it('открывает смену по предложению заказа, в котором нет адреса', () => {
    expect(resolveDriverNotificationHref(undefined, { eventId: 'order.offer' })).toBe('/(tabs)');
  });

  it('ведёт на статус проверки документов', () => {
    expect(resolveDriverNotificationHref(undefined, { eventId: 'document.verified' })).toBe(
      '/(verification)/status',
    );
  });
});
