import { sanitizePushData } from '../../../common/compliance/push-payload';
import { buildExpoPushMessage } from './expo-push-message';

describe('buildExpoPushMessage', () => {
  it('кладёт шаблон и канал orders, без телефона и адреса', () => {
    const data = sanitizePushData({
      eventId: 'order.offer',
      phone: '+79280000001',
      pickupAddress: 'Назрань, Московская 12',
    });

    const message = buildExpoPushMessage('ExponentPushToken[abc]', {
      title: 'Новый заказ',
      body: 'Рядом с вами новый заказ. Откройте приложение, чтобы принять его',
      data,
      ttlSeconds: 30,
      channelId: 'orders',
    });

    expect(message).toEqual({
      to: 'ExponentPushToken[abc]',
      title: 'Новый заказ',
      body: 'Рядом с вами новый заказ. Откройте приложение, чтобы принять его',
      data: { eventId: 'order.offer' },
      sound: 'default',
      priority: 'high',
      channelId: 'orders',
      ttl: 30,
    });
    expect(JSON.stringify(message)).not.toContain('79280000001');
    expect(JSON.stringify(message)).not.toContain('Назрань');
  });

  it('акции уходят в канал promo', () => {
    expect(
      buildExpoPushMessage('ExponentPushToken[abc]', {
        title: 'Промокод применён',
        body: 'Бонусный баланс пополнен',
        data: { eventId: 'promo.redeemed' },
      }).channelId,
    ).toBe('promo');
  });
});
