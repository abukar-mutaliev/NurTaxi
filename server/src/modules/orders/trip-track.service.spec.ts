import { OrderStatus } from '../../common/enums/order-status.enum';
import { TripTrackService } from './trip-track.service';

const INTERVAL_SEC = 15;
const START = new Date('2026-01-01T10:00:00Z').getTime();

function createService(status: OrderStatus = OrderStatus.InProgress) {
  const saved: Array<{ recordedAt: Date }> = [];
  const order = { id: 'order-1', regionId: 'region-1', status };
  const points = {
    create: jest.fn((point: { recordedAt: Date }) => point),
    findOne: jest.fn(async () => saved.at(-1) ?? null),
    save: jest.fn(async (point: { recordedAt: Date }) => {
      saved.push(point);
      return point;
    }),
  };
  const orders = { findOne: jest.fn(async () => order) };
  const regions = {
    getRegionOrThrow: jest.fn(async () => ({
      complianceConfig: { tripTrackIntervalSec: INTERVAL_SEC },
    })),
  };

  const service = new TripTrackService(points as never, orders as never, regions as never);
  return { order, orders, points, saved, service };
}

describe('TripTrackService', () => {
  let now = START;

  beforeEach(() => {
    now = START;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('пишет первую точку поездки', async () => {
    const { saved, service } = createService();

    await service.recordIfDue('order-1', 43.1, 44.8, 7);

    expect(saved).toEqual([
      expect.objectContaining({ accuracyM: 7, lat: 43.1, lng: 44.8, orderId: 'order-1' }),
    ]);
  });

  it('между точками трека в базу не ходит', async () => {
    const { orders, points, saved, service } = createService();
    await service.recordIfDue('order-1', 43.1, 44.8);
    orders.findOne.mockClear();
    points.findOne.mockClear();

    for (let second = 1; second < INTERVAL_SEC; second += 1) {
      now = START + second * 1000;
      await service.recordIfDue('order-1', 43.1, 44.8);
    }

    expect(saved).toHaveLength(1);
    expect(orders.findOne).not.toHaveBeenCalled();
    expect(points.findOne).not.toHaveBeenCalled();
  });

  it('пишет следующую точку, когда интервал вышел', async () => {
    const { saved, service } = createService();
    await service.recordIfDue('order-1', 43.1, 44.8);

    now = START + INTERVAL_SEC * 1000;
    await service.recordIfDue('order-1', 43.2, 44.9);

    expect(saved).toHaveLength(2);
  });

  it('не пишет точку раньше срока, даже если прошлую записал другой инстанс', async () => {
    const { saved, service } = createService();
    saved.push({ recordedAt: new Date(START - 5000) });

    await service.recordIfDue('order-1', 43.1, 44.8);
    expect(saved).toHaveLength(1);

    now = START + 10_000;
    await service.recordIfDue('order-1', 43.1, 44.8);
    expect(saved).toHaveLength(2);
  });

  it('до начала подачи трек не пишет, а после — начинает', async () => {
    const { order, saved, service } = createService(OrderStatus.DriverAssigned);

    await service.recordIfDue('order-1', 43.1, 44.8);
    expect(saved).toHaveLength(0);

    order.status = OrderStatus.DriverEnRoute;
    now = START + 5000;
    await service.recordIfDue('order-1', 43.1, 44.8);
    expect(saved).toHaveLength(1);
  });
});
