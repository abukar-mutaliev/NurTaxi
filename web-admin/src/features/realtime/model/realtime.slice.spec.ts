import { describe, expect, it } from 'vitest';
import { realtimeReducer, realtimeStatusChanged, sosReceived } from '@/features/realtime';
import { OrderStatus } from '@/shared/model/enums';

describe('realtime slice', () => {
  it('tracks connection status', () => {
    const state = realtimeReducer(undefined, realtimeStatusChanged('connected'));
    expect(state.status).toBe('connected');
  });

  it('stores last SOS event', () => {
    const event = {
      orderId: 'order-1',
      status: OrderStatus.InProgress,
      pickup: { lat: 0, lng: 0, address: 'A' },
      dropoff: { lat: 1, lng: 1, address: 'B' },
      clientLocation: { lat: 0.5, lng: 0.5 },
      driver: null,
      vehicle: null,
      trackingUrl: '/orders/order-1/track',
      activatedAt: new Date().toISOString(),
    };
    const state = realtimeReducer(undefined, sosReceived(event));
    expect(state.lastSos?.orderId).toBe('order-1');
  });
});
