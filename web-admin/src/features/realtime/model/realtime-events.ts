import type { OrderStatus } from '@/shared/model/enums';

export const RealtimeEvent = {
  OrderStatus: 'order.status',
  DriverLocation: 'driver.location',
  SosActivated: 'sos.activated',
  PaymentFailed: 'payment.failed',
  DocumentVerified: 'document.verified',
  SubscribeOrder: 'subscribe:order',
} as const;

export interface OrderStatusEvent {
  orderId: string;
  regionId?: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  at: string;
}

export interface DriverLocationEvent {
  orderId: string;
  regionId?: string;
  lat: number;
  lng: number;
  at: string;
}

export interface SosActivatedEvent {
  orderId: string;
  regionId?: string;
  status: OrderStatus;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  clientLocation: { lat: number; lng: number };
  driver: { id: string; fullName: string; phone: string; rating: number } | null;
  vehicle: { make: string; model: string; plateNumber: string; color: string } | null;
  trackingUrl: string;
  activatedAt: string;
}

export interface PaymentFailedEvent {
  orderId: string;
  regionId?: string;
  clientId: string;
  paymentId: string;
  reason: string;
  nextRetryAt: string | null;
}

export interface DocumentVerifiedEvent {
  driverId: string;
  userId: string;
  regionId?: string;
}

export interface ServerToClientEvents {
  'order.status': (payload: OrderStatusEvent) => void;
  'driver.location': (payload: DriverLocationEvent) => void;
  'sos.activated': (payload: SosActivatedEvent) => void;
  'payment.failed': (payload: PaymentFailedEvent) => void;
  'document.verified': (payload: DocumentVerifiedEvent) => void;
}

export interface ClientToServerEvents {
  'subscribe:order': (
    payload: { orderId: string },
    ack?: (response: { success: boolean; room?: string }) => void,
  ) => void;
}

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
