import { orderRouteLeg, orderRouteWaypoints } from './order-route-leg';
import { OrderStatus } from '@nurtaxi/shared-core/shared/model';

describe('orderRouteWaypoints', () => {
  const pickup = { lat: 43.2167, lng: 44.7667 };
  const dropoff = { lat: 43.1687, lng: 44.8133 };
  const origin = { lat: 43.2, lng: 44.8 };

  it('до посадки ведёт от позиции водителя к клиенту', () => {
    expect(
      orderRouteWaypoints({
        dropoff,
        origin,
        pickup,
        status: OrderStatus.DriverEnRoute,
      }),
    ).toEqual([origin, pickup]);
  });

  it('без позиции водителя не подменяет участок линией всей поездки', () => {
    expect(
      orderRouteWaypoints({
        dropoff,
        origin: null,
        pickup,
        status: OrderStatus.DriverAssigned,
      }),
    ).toBeNull();
  });

  it('после начала поездки ведёт к точке назначения', () => {
    expect(
      orderRouteWaypoints({
        dropoff,
        origin,
        pickup,
        status: OrderStatus.InProgress,
      }),
    ).toEqual([origin, dropoff]);
  });
});

describe('orderRouteLeg', () => {
  it('считает прибытие к клиенту ещё участком «до подачи»', () => {
    expect(orderRouteLeg(OrderStatus.DriverArrived)).toBe('to-pickup');
  });
});
