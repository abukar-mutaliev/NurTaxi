/**
 * Статусы заказа (Req §12.1, Des §5.2).
 */
export enum OrderStatus {
  Created = 'created',
  SearchingDriver = 'searching_driver',
  DriverAssigned = 'driver_assigned',
  DriverEnRoute = 'driver_en_route',
  DriverArrived = 'driver_arrived',
  InProgress = 'in_progress',
  Completed = 'completed',
  Closed = 'closed',
  CancelledByClient = 'cancelled_by_client',
  CancelledByDriver = 'cancelled_by_driver',
  CancelledSystem = 'cancelled_system',
  FailedPayment = 'failed_payment',
}

/** Статусы, при которых заказ считается «активным» (Req §9 п.2). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.Created,
  OrderStatus.SearchingDriver,
  OrderStatus.DriverAssigned,
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
  OrderStatus.InProgress,
  OrderStatus.Completed,
  OrderStatus.FailedPayment,
];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.Closed,
  OrderStatus.CancelledByClient,
  OrderStatus.CancelledByDriver,
  OrderStatus.CancelledSystem,
];

/** Статусы, при которых водитель выполняет поездку. */
export const DRIVER_ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DriverAssigned,
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
  OrderStatus.InProgress,
  OrderStatus.Completed,
];

export enum PaymentMethod {
  Cash = 'cash',
  Card = 'card',
}
