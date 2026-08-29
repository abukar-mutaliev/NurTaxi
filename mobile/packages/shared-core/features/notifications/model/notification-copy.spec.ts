import { resolveNotificationCopy } from './notification-copy';

describe('resolveNotificationCopy', () => {
  it('заменяет сырой enum в теле уведомления на русский статус', () => {
    const copy = resolveNotificationCopy({
      type: 'order.status_changed',
      title: 'Статус поездки',
      body: 'Новый статус: searching_driver',
      data: { toStatus: 'searching_driver' },
    });

    expect(copy.body).toBe('Ищем водителя');
  });

  it('достаёт статус из текста, если его нет в data', () => {
    const copy = resolveNotificationCopy({
      type: 'order.status_changed',
      title: 'Статус поездки',
      body: 'Новый статус: driver_en_route',
      data: {},
    });

    expect(copy.body).toBe('Водитель едет к вам');
  });
});
