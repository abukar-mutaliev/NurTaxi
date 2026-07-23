import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { assertTransitionAllowed } from './order-state-machine';

describe('order-state-machine', () => {
  it('разрешает CREATED → SEARCHING_DRIVER', () => {
    expect(() =>
      assertTransitionAllowed(OrderStatus.Created, OrderStatus.SearchingDriver),
    ).not.toThrow();
  });

  it('запрещает CREATED → COMPLETED', () => {
    expect(() => assertTransitionAllowed(OrderStatus.Created, OrderStatus.Completed)).toThrow(
      BadRequestException,
    );
  });

  it('разрешает полный happy-path', () => {
    const path = [
      OrderStatus.Created,
      OrderStatus.SearchingDriver,
      OrderStatus.DriverAssigned,
      OrderStatus.DriverEnRoute,
      OrderStatus.DriverArrived,
      OrderStatus.InProgress,
      OrderStatus.Completed,
      OrderStatus.Closed,
    ];

    for (let i = 0; i < path.length - 1; i++) {
      expect(() => assertTransitionAllowed(path[i], path[i + 1])).not.toThrow();
    }
  });
});
