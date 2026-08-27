import { CompletenessStatus } from '../../common/enums/compliance.enum';
import { OrderStatus, TERMINAL_ORDER_STATUSES } from '../../common/enums/order-status.enum';
import { HISTORICALLY_UNAVAILABLE, type AssignmentSnapshot } from '../../common/compliance/assignment-snapshot';
import type { Order } from './entities/order.entity';

export interface CompletenessResult {
  status: CompletenessStatus;
  missing: string[];
}

const CANCELLED: OrderStatus[] = [
  OrderStatus.CancelledByClient,
  OrderStatus.CancelledByDriver,
  OrderStatus.CancelledSystem,
];

function present<T>(value: T | typeof HISTORICALLY_UNAVAILABLE | null | undefined): boolean {
  return value != null && value !== HISTORICALLY_UNAVAILABLE;
}

/**
 * Проверка полноты обязательных сведений при терминальном статусе (FZ-04.9).
 */
export function evaluateOrderCompleteness(order: Order): CompletenessResult {
  if (order.assignmentSnapshot?.historicallyUnavailable) {
    return { status: CompletenessStatus.HistoricallyUnavailable, missing: [] };
  }

  const missing: string[] = [];
  if (!order.publicNumber) missing.push('publicNumber');
  if (!order.regionId) missing.push('regionId');
  if (!order.paymentMethod) missing.push('paymentMethod');
  if (!order.pickupAddress) missing.push('pickupAddress');
  if (!order.dropoffAddress) missing.push('dropoffAddress');

  const snapshot: AssignmentSnapshot | null = order.assignmentSnapshot;
  if (!snapshot) {
    missing.push('assignmentSnapshot');
  } else {
    if (!present(snapshot.driver)) missing.push('snapshot.driver');
    if (!present(snapshot.vehicle)) missing.push('snapshot.vehicle');
    if (!present(snapshot.carrier)) missing.push('snapshot.carrier');
    if (!present(snapshot.permit)) missing.push('snapshot.permit');
  }

  const tripHappened = order.status === OrderStatus.Closed || order.status === OrderStatus.Completed;
  if (tripHappened) {
    if (!order.tripStartedAt) missing.push('tripStartedAt');
    if (!order.tripEndedAt) missing.push('tripEndedAt');
  }
  if (CANCELLED.includes(order.status) && order.tripStartedAt && !order.tripEndedAt) {
    missing.push('tripEndedAt');
  }

  if (!TERMINAL_ORDER_STATUSES.includes(order.status) && order.status !== OrderStatus.Completed) {
    return { status: CompletenessStatus.Pending, missing };
  }

  return {
    status: missing.length === 0 ? CompletenessStatus.Complete : CompletenessStatus.Incomplete,
    missing,
  };
}
