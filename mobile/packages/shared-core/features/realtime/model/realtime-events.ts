/**
 * Контракт WebSocket (`requirements.md §15.1`, `design.md §10`).
 *
 * Сервер: Socket.IO, namespace `/ws`, JWT в `handshake.auth.token`
 * (`server/src/modules/realtime/realtime.gateway.ts`). Комнаты назначаются автоматически:
 * `client:{userId}` либо `driver:{userId}`; на `order:{orderId}` подписываемся явно.
 */
import type { DriverOrderOffer, OrderStatus } from '@nurtaxi/shared-core/shared/model';

export const RealtimeEvent = {
  OrderStatus: 'order.status',
  DriverLocation: 'driver.location',
  SosActivated: 'sos.activated',
  /** Предложение заказа водителю: приходит в личную комнату `driver:{userId}`. */
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

/**
 * Предложение заказа водителю (`§15.3`). Живёт ограниченное время: после `expiresAt`
 * подбор переходит к следующему кандидату, и принять заказ уже нельзя.
 */
/**
 * Тот же тип, что отдаёт `GET /driver/orders/offer`: предложение приходит двумя путями,
 * и расходиться им нельзя. Определение живёт в общих моделях — там же, где остальные
 * формы ответов API.
 */
export type OrderOfferEvent = DriverOrderOffer;

/** События, которые сервер шлёт приложению. */
export interface ServerToClientEvents {
  'order.status': (payload: OrderStatusEvent) => void;
  'driver.location': (payload: DriverLocationEvent) => void;
  'sos.activated': (payload: SosActivatedEvent) => void;
  'order.offer': (payload: OrderOfferEvent) => void;
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
