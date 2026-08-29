import type { OrderStatus, PaymentMethod } from '@/shared/model/enums';

export interface OrderRoute {
  polyline: string;
  distanceM: number;
  durationS: number;
}

export interface OrderDriver {
  id: string;
  fullName: string;
  rating: number;
  phone: string | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    plateNumber: string;
    color: string;
    year: number;
  } | null;
}

export interface Order {
  id: string;
  publicNumber?: string;
  status: OrderStatus;
  regionId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  priceEstimated: number;
  priceFinal: number | null;
  cancellationFee: number | null;
  paymentMethod: PaymentMethod;
  comment: string | null;
  route: OrderRoute | null;
  driver: OrderDriver | null;
  createdAt: string;
}

export interface OrderListPage {
  items: Order[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface OrderStatusLogEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string | null;
  actorId: string | null;
  actorLabel: string | null;
  createdAt: string;
}

export interface NearbyDriver {
  driverId: string;
  fullName: string;
  phone: string | null;
  rating: number;
  lat: number;
  lng: number;
  distanceM: number;
  vehicle: { make: string; model: string; plateNumber: string } | null;
}

export interface AdminAssignDriverDto {
  driverId: string;
}

export interface AdminOrderStatusDto {
  status: string;
  reason?: string;
}

export interface AdminRefundDto {
  amount: number;
  idempotencyKey: string;
  reason?: string;
}
