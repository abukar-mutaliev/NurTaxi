import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../../common/enums/order-status.enum';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Created]: [OrderStatus.SearchingDriver, OrderStatus.CancelledByClient],
  [OrderStatus.SearchingDriver]: [
    OrderStatus.DriverAssigned,
    OrderStatus.CancelledByClient,
    OrderStatus.CancelledSystem,
  ],
  [OrderStatus.DriverAssigned]: [
    OrderStatus.DriverEnRoute,
    OrderStatus.CancelledByClient,
    OrderStatus.CancelledByDriver,
  ],
  [OrderStatus.DriverEnRoute]: [
    OrderStatus.DriverArrived,
    OrderStatus.CancelledByClient,
    OrderStatus.CancelledByDriver,
  ],
  [OrderStatus.DriverArrived]: [
    OrderStatus.InProgress,
    OrderStatus.CancelledByClient,
    OrderStatus.CancelledByDriver,
  ],
  [OrderStatus.InProgress]: [OrderStatus.Completed],
  [OrderStatus.Completed]: [OrderStatus.Closed, OrderStatus.FailedPayment],
  [OrderStatus.FailedPayment]: [OrderStatus.Closed],
  [OrderStatus.Closed]: [],
  [OrderStatus.CancelledByClient]: [],
  [OrderStatus.CancelledByDriver]: [],
  [OrderStatus.CancelledSystem]: [],
};

export function assertTransitionAllowed(from: OrderStatus, to: OrderStatus): void {
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException({
      code: 'INVALID_STATUS_TRANSITION',
      message: `Переход ${from} → ${to} недопустим`,
      details: { from, to, allowed },
    });
  }
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return (TRANSITIONS[status]?.length ?? 0) === 0;
}
