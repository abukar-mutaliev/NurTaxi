/**
 * Контракт WebSocket (`requirements.md §15.1`, `design.md §10`).
 *
 * Сервер: Socket.IO, namespace `/ws`, JWT в `handshake.auth.token`
 * (`server/src/modules/realtime/realtime.gateway.ts`). Комнаты назначаются автоматически:
 * `client:{userId}` либо `driver:{userId}`; на `order:{orderId}` подписываемся явно.
 */
import type { OrderStatus } from '@nurtaxi/shared-core/shared/model';

export const RealtimeEvent = {
  OrderStatus: 'order.status',
  DriverLocation: 'driver.location',
  SosActivated: 'sos.activated',
  /** Объявлено сервером, но пока не рассылается — см. `docs/mob.api-delta.md`. */
  OrderOffer: 'order.offer',
  SubscribeOrder: 'subscribe:order',
} as const;

export interface OrderStatusEvent {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  at: string;
}

export interface DriverLocationEvent {
  orderId: string;
  lat: number;
  lng: number;
  at: string;
}

export interface SosActivatedEvent {
  orderId: string;
  status: OrderStatus;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  clientLocation: { lat: number; lng: number };
  driver: { id: string; fullName: string; phone: string; rating: number } | null;
  vehicle: { make: string; model: string; plateNumber: string; color: string } | null;
  trackingUrl: string;
  activatedAt: string;
}

/** События, которые сервер шлёт приложению. */
export interface ServerToClientEvents {
  'order.status': (payload: OrderStatusEvent) => void;
  'driver.location': (payload: DriverLocationEvent) => void;
  'sos.activated': (payload: SosActivatedEvent) => void;
  'order.offer': (payload: { orderId: string; expiresAt: string }) => void;
}

/** События, которые приложение шлёт серверу. */
export interface ClientToServerEvents {
  'subscribe:order': (
    payload: { orderId: string },
    ack?: (response: { success: boolean; room?: string }) => void,
  ) => void;
  'driver.location': (
    payload: { lat: number; lng: number },
    ack?: (response: { success: boolean }) => void,
  ) => void;
}

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
