/**
 * Конечный автомат заказа на стороне клиента (M4.1, `requirements.md §12`).
 *
 * Переходы выполняет сервер — здесь только производные признаки для UI: активен ли заказ,
 * можно ли отменить, доступен ли SOS, какой экран показывать.
 */
import { OrderStatus } from '@nurtaxi/shared-core/shared/model';
import type { BadgeTone } from '@nurtaxi/shared-core/shared/ui';

/** Статусы, при которых заказ считается активным и блокирует создание нового (`§9`). */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Created,
  OrderStatus.SearchingDriver,
  OrderStatus.DriverAssigned,
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
  OrderStatus.InProgress,
];

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Closed,
  OrderStatus.CancelledByClient,
  OrderStatus.CancelledByDriver,
  OrderStatus.CancelledSystem,
];

/** Отмена клиентом допустима до начала поездки (`§8.12`). */
export const CLIENT_CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Created,
  OrderStatus.SearchingDriver,
  OrderStatus.DriverAssigned,
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
];

/** SOS доступен, когда клиент уже в машине или водитель рядом (`§8.7`). */
export const SOS_ALLOWED_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
  OrderStatus.InProgress,
];

/** Аудиозапись поездки доступна с момента назначения водителя до завершения поездки. */
export const TRIP_RECORDING_ALLOWED_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DriverAssigned,
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
  OrderStatus.InProgress,
];

export function isActiveOrder(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status);
}

export function isTerminalOrder(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

export function isCancellableByClient(status: OrderStatus): boolean {
  return CLIENT_CANCELLABLE_STATUSES.includes(status);
}

export function isSosAllowed(status: OrderStatus): boolean {
  return SOS_ALLOWED_STATUSES.includes(status);
}

export function isTripRecordingAllowed(status: OrderStatus): boolean {
  return TRIP_RECORDING_ALLOWED_STATUSES.includes(status);
}

export function isCancelled(status: OrderStatus): boolean {
  return (
    status === OrderStatus.CancelledByClient ||
    status === OrderStatus.CancelledByDriver ||
    status === OrderStatus.CancelledSystem
  );
}

/** Ключ i18n для человекочитаемого статуса. */
export function orderStatusLabelKey(status: OrderStatus): string {
  return `orderStatus.${status}`;
}

export function orderStatusTone(status: OrderStatus): BadgeTone {
  if (isCancelled(status)) {
    return 'danger';
  }
  if (status === OrderStatus.FailedPayment) {
    return 'warning';
  }
  if (status === OrderStatus.Completed || status === OrderStatus.Closed) {
    return 'success';
  }
  return 'primary';
}

/**
 * Этап процесса заказа — на его основе строится маршрутизация внутри `processes/order-flow`
 * без разбора всех 12 статусов в каждом компоненте.
 */
export type OrderStage = 'searching' | 'waiting-driver' | 'riding' | 'finishing' | 'closed';

export function orderStage(status: OrderStatus): OrderStage {
  switch (status) {
    case OrderStatus.Created:
    case OrderStatus.SearchingDriver:
      return 'searching';
    case OrderStatus.DriverAssigned:
    case OrderStatus.DriverEnRoute:
    case OrderStatus.DriverArrived:
      return 'waiting-driver';
    case OrderStatus.InProgress:
      return 'riding';
    case OrderStatus.Completed:
    case OrderStatus.FailedPayment:
      return 'finishing';
    default:
      return 'closed';
  }
}
