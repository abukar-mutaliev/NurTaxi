import { RealtimeBroadcastService } from './realtime-broadcast.service';
import type { RealtimeEnvelope } from './realtime.constants';

function createService() {
  const service = new RealtimeBroadcastService();
  const sent: RealtimeEnvelope[] = [];
  service.setHandler((envelope) => {
    sent.push(envelope);
  });
  return { sent, service };
}

describe('RealtimeBroadcastService', () => {
  it('отдаёт событие шлюзу ровно один раз', async () => {
    const { sent, service } = createService();

    await service.publish('order:1', 'order.status', { toStatus: 'closed' });

    expect(sent).toEqual([
      { rooms: ['order:1'], event: 'order.status', data: { toStatus: 'closed' } },
    ]);
  });

  it('шлёт точку водителя одним событием в комнату заказа и комнату клиента', async () => {
    const { sent, service } = createService();

    await service.publishDriverLocation('order-1', 'client-1', { lat: 43.1, lng: 44.8 });

    expect(sent).toEqual([
      {
        rooms: ['order:order-1', 'client:client-1'],
        event: 'driver.location',
        data: { orderId: 'order-1', lat: 43.1, lng: 44.8 },
      },
    ]);
  });

  it('статус заказа: одно событие участникам и одно операторам', async () => {
    const { sent, service } = createService();

    await service.publishOrderStatus('order-1', 'client-1', 'driver-user-1', 'region-1', {
      toStatus: 'in_progress',
    });

    expect(sent).toEqual([
      {
        rooms: ['order:order-1', 'client:client-1', 'driver:driver-user-1'],
        event: 'order.status',
        data: { orderId: 'order-1', toStatus: 'in_progress' },
      },
      {
        rooms: ['region:region-1', 'operators:all'],
        event: 'order.status',
        data: { regionId: 'region-1', orderId: 'order-1', toStatus: 'in_progress' },
      },
    ]);
  });

  it('без водителя не трогает его комнату', async () => {
    const { sent, service } = createService();

    await service.publishOrderStatus('order-1', 'client-1', null, 'region-1', {});

    expect(sent[0].rooms).toEqual(['order:order-1', 'client:client-1']);
  });

  it('без региона событие получают только супер-админы', async () => {
    const { sent, service } = createService();

    await service.publishToStaff(null, 'document.verified', { driverId: 'driver-1' });

    expect(sent).toEqual([
      { rooms: ['operators:all'], event: 'document.verified', data: { driverId: 'driver-1' } },
    ]);
  });

  it('не называет одну комнату дважды', async () => {
    const { sent, service } = createService();

    await service.publish(['order:1', 'order:1'], 'order.status', {});

    expect(sent[0].rooms).toEqual(['order:1']);
  });

  it('сбой отправки не роняет операцию, которая событие породила', async () => {
    const service = new RealtimeBroadcastService();
    service.setHandler(() => {
      throw new Error('socket down');
    });

    await expect(service.publish('order:1', 'order.status', {})).resolves.toBeUndefined();
  });

  it('до запуска шлюза событие молча пропадает, а не бросает ошибку', async () => {
    const service = new RealtimeBroadcastService();

    await expect(service.publish('order:1', 'order.status', {})).resolves.toBeUndefined();
  });
});
