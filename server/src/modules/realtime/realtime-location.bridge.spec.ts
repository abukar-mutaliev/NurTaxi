import type {
  PickupProgress,
  PickupProgressStore,
  PickupProgressUpdate,
} from './pickup-progress.store';
import { RealtimeLocationBridge } from './realtime-location.bridge';

const ORDER = { id: 'order-1', clientId: 'client-1' };
const ROUTE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

/** Хранилище подачи в памяти — с тем же поведением, что у Redis-версии. */
function createPickupStore(): Pick<PickupProgressStore, 'read' | 'readEta' | 'save'> {
  const byOrder = new Map<string, PickupProgress>();
  return {
    read: async (orderId) => ({ ...byOrder.get(orderId) }),
    readEta: async (orderId) => byOrder.get(orderId)?.eta,
    save: async (orderId, update: PickupProgressUpdate) => {
      const next = { ...byOrder.get(orderId) };
      for (const field of ['eta', 'route'] as const) {
        const value = update[field];
        if (typeof value === 'string') {
          next[field] = value;
        } else if (value === null) {
          delete next[field];
        }
      }
      byOrder.set(orderId, next);
    },
  };
}

function createBridge(
  options: { order?: typeof ORDER | null; pickupStore?: ReturnType<typeof createPickupStore> } = {},
) {
  const broadcast = { publishDriverLocation: jest.fn().mockResolvedValue(undefined) };
  const eventBus = { publish: jest.fn() };
  const driversService = {
    getCachedLocation: jest.fn().mockResolvedValue({ lat: 43.1, lng: 44.8 }),
    updateLocation: jest.fn().mockResolvedValue({ driverId: 'driver-1' }),
  };
  const ordersService = {
    getActiveOrderForDriver: jest
      .fn()
      .mockResolvedValue(options.order === undefined ? ORDER : options.order),
    getActiveOrderLocationContext: jest
      .fn()
      .mockResolvedValue({ driverId: 'driver-1', id: ORDER.id, regionId: 'region-1' }),
    recordTrackPoint: jest.fn().mockResolvedValue(undefined),
  };

  const bridge = new RealtimeLocationBridge(
    broadcast as never,
    eventBus as never,
    driversService as never,
    ordersService as never,
    (options.pickupStore ?? createPickupStore()) as never,
  );

  /** Данные последнего события, ушедшего клиенту. */
  const lastEvent = (): Record<string, unknown> => {
    const call = broadcast.publishDriverLocation.mock.calls.at(-1);
    return call?.[2] as Record<string, unknown>;
  };

  return { bridge, broadcast, driversService, lastEvent, ordersService };
}

describe('RealtimeLocationBridge', () => {
  it('без активного заказа обновляет точку водителя, но никому её не рассылает', async () => {
    const { bridge, broadcast, driversService } = createBridge({ order: null });

    await bridge.updateAndBroadcast('user-1', 43.1, 44.8);

    expect(driversService.updateLocation).toHaveBeenCalledWith('user-1', 43.1, 44.8);
    expect(broadcast.publishDriverLocation).not.toHaveBeenCalled();
  });

  it('рассылает точку клиенту заказа', async () => {
    const { bridge, broadcast, lastEvent, ordersService } = createBridge();

    await bridge.updateAndBroadcast('user-1', 43.1, 44.8);

    expect(ordersService.getActiveOrderForDriver).toHaveBeenCalledWith('driver-1');
    expect(broadcast.publishDriverLocation).toHaveBeenCalledWith(
      ORDER.id,
      ORDER.clientId,
      expect.objectContaining({ lat: 43.1, lng: 44.8, orderId: ORDER.id }),
    );
    expect(lastEvent()).not.toHaveProperty('heading');
    expect(lastEvent()).not.toHaveProperty('route');
  });

  describe('курс машины', () => {
    it('передаёт клиенту курс по GPS', async () => {
      const { bridge, lastEvent } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { heading: 271.46 });

      expect(lastEvent().heading).toBe(271.5);
    });

    it('не подставляет прошлый курс, если в новой точке его нет', async () => {
      const { bridge, lastEvent } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { heading: 90 });
      await bridge.updateAndBroadcast('user-1', 43.2, 44.9);

      expect(lastEvent()).not.toHaveProperty('heading');
    });

    it.each([[null], [-1], [361], [Number.NaN], ['90'], [Number.POSITIVE_INFINITY]])(
      'отбрасывает негодный курс %p',
      async (heading) => {
        const { bridge, lastEvent } = createBridge();

        await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { heading });

        expect(lastEvent()).not.toHaveProperty('heading');
      },
    );

    it('считает 360° тем же севером, что и 0°', async () => {
      const { bridge, lastEvent } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { heading: 360 });

      expect(lastEvent().heading).toBe(0);
    });
  });

  describe('линия подачи', () => {
    it('отдаёт линию в том событии, с которым её прислал водитель', async () => {
      const { bridge, lastEvent } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { route: ROUTE });

      expect(lastEvent().route).toBe(ROUTE);
    });

    it('не повторяет линию в следующих точках', async () => {
      const { bridge, lastEvent } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { route: ROUTE });
      await bridge.updateAndBroadcast('user-1', 43.2, 44.9);

      expect(lastEvent()).not.toHaveProperty('route');
    });

    it('помнит линию для клиента, который подписался позже', async () => {
      const { bridge } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { route: ROUTE });
      await bridge.updateAndBroadcast('user-1', 43.2, 44.9);

      await expect(bridge.snapshotForOrder(ORDER.id)).resolves.toMatchObject({ route: ROUTE });
    });

    it('снимает линию, когда подача закончилась', async () => {
      const { bridge, lastEvent } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { route: ROUTE });
      await bridge.updateAndBroadcast('user-1', 43.2, 44.9, { route: null });

      expect(lastEvent().route).toBeNull();
      await expect(bridge.snapshotForOrder(ORDER.id)).resolves.not.toHaveProperty('route');
    });

    it('отдаёт линию клиенту, который подписался через другой инстанс', async () => {
      const pickupStore = createPickupStore();
      const receiving = createBridge({ pickupStore });
      const subscribing = createBridge({ pickupStore });

      await receiving.bridge.updateAndBroadcast('user-1', 43.1, 44.8, {
        eta: '5 мин',
        route: ROUTE,
      });

      await expect(subscribing.bridge.snapshotForOrder(ORDER.id)).resolves.toMatchObject({
        eta: '5 мин',
        route: ROUTE,
      });
    });
  });

  describe('снимок при подписке', () => {
    it('не отдаёт точку, когда водитель этот заказ уже не выполняет', async () => {
      const { bridge, driversService, ordersService } = createBridge();
      ordersService.getActiveOrderLocationContext.mockResolvedValue(null);

      await expect(bridge.snapshotForOrder(ORDER.id)).resolves.toBeNull();
      expect(driversService.getCachedLocation).not.toHaveBeenCalled();
    });

    it('ставит время самой точки, а не момент подписки', async () => {
      const { bridge, driversService } = createBridge();
      driversService.getCachedLocation.mockResolvedValue({
        lat: 43.1,
        lng: 44.8,
        updatedAt: '2026-01-01T10:00:01.000Z',
      });

      await expect(bridge.snapshotForOrder(ORDER.id)).resolves.toMatchObject({
        at: '2026-01-01T10:00:01.000Z',
        lat: 43.1,
        lng: 44.8,
      });
    });
  });

  describe('время до клиента', () => {
    it('повторяет последнюю строку, пока водитель не прислал новую', async () => {
      const { bridge, lastEvent } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { eta: '5 мин' });
      await bridge.updateAndBroadcast('user-1', 43.2, 44.9);

      expect(lastEvent().eta).toBe('5 мин');
    });
  });

  describe('трек поездки', () => {
    it('пишет погрешность точки в трек', async () => {
      const { bridge, ordersService } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { accuracy: 7.26 });

      expect(ordersService.recordTrackPoint).toHaveBeenCalledWith(ORDER.id, 43.1, 44.8, 7.3);
    });

    it('без погрешности пишет точку как раньше', async () => {
      const { bridge, ordersService } = createBridge();

      await bridge.updateAndBroadcast('user-1', 43.1, 44.8, { accuracy: -1 });

      expect(ordersService.recordTrackPoint).toHaveBeenCalledWith(ORDER.id, 43.1, 44.8, undefined);
    });
  });
});
