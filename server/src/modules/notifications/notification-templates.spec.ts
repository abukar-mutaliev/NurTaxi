import { getNotificationTemplate, isChannelEnabled } from './notification-templates';

describe('notification-templates', () => {
  it('returns template for order.driver_assigned', () => {
    expect(getNotificationTemplate('order.driver_assigned')?.type).toBe('order.driver_assigned');
  });

  it('respects user notification settings', () => {
    expect(isChannelEnabled({ push: false, sms: true, email: false }, 'push')).toBe(false);
    expect(isChannelEnabled({ push: true, sms: true, email: false }, 'in_app')).toBe(true);
  });
});
