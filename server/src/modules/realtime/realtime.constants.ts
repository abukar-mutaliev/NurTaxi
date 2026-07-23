/** Имена комнат WebSocket (Des §10). */
export type RealtimeRoom = `client:${string}` | `driver:${string}` | `order:${string}`;

export const clientRoom = (userId: string): RealtimeRoom => `client:${userId}`;
export const driverRoom = (userId: string): RealtimeRoom => `driver:${userId}`;
export const orderRoom = (orderId: string): RealtimeRoom => `order:${orderId}`;

/** События, рассылаемые клиентам/водителям через WebSocket. */
export enum RealtimeEvent {
  OrderStatus = 'order.status',
  DriverLocation = 'driver.location',
  SosActivated = 'sos.activated',
  OrderOffer = 'order.offer',
}

export interface RealtimeEnvelope {
  room: RealtimeRoom;
  event: RealtimeEvent | string;
  data: Record<string, unknown>;
}

export const REALTIME_REDIS_CHANNEL = 'realtime:broadcast';
