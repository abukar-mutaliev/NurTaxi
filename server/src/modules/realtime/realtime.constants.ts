/** Имена комнат WebSocket (Des §10). */
export type RealtimeRoom =
  | `client:${string}`
  | `driver:${string}`
  | `order:${string}`
  | `staff:${string}`
  | `region:${string}`
  | 'operators:all';

export const clientRoom = (userId: string): RealtimeRoom => `client:${userId}`;
export const driverRoom = (userId: string): RealtimeRoom => `driver:${userId}`;
export const orderRoom = (orderId: string): RealtimeRoom => `order:${orderId}`;
export const staffRoom = (userId: string): RealtimeRoom => `staff:${userId}`;
export const regionRoom = (regionId: string): RealtimeRoom => `region:${regionId}`;
export const operatorsAllRoom = (): RealtimeRoom => 'operators:all';

export const STAFF_WS_ROLES = ['operator', 'regional_admin', 'super_admin'] as const;

/** События, рассылаемые клиентам/водителям через WebSocket. */
export enum RealtimeEvent {
  OrderStatus = 'order.status',
  DriverLocation = 'driver.location',
  SosActivated = 'sos.activated',
  OrderOffer = 'order.offer',
  PaymentFailed = 'payment.failed',
  DocumentVerified = 'document.verified',
}

export interface RealtimeEnvelope {
  room: RealtimeRoom;
  event: RealtimeEvent | string;
  data: Record<string, unknown>;
}

export const REALTIME_REDIS_CHANNEL = 'realtime:broadcast';
