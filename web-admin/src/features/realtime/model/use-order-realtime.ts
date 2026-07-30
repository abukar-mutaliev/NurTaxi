import { useEffect, useState } from 'react';
import { realtimeClient } from './realtime-client';
import { RealtimeEvent } from './realtime-events';
import type { DriverLocationEvent } from './realtime-events';

/** Live-подписка на позицию водителя и статус конкретного заказа. */
export function useOrderRealtime(orderId: string | null) {
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribeRoom = realtimeClient.subscribeToOrder(orderId);

    const onLocation = (event: DriverLocationEvent) => {
      if (event.orderId !== orderId) return;
      setDriverPosition({ lat: event.lat, lng: event.lng });
    };

    const offLocation = realtimeClient.on(RealtimeEvent.DriverLocation, onLocation);

    return () => {
      offLocation();
      unsubscribeRoom();
      setDriverPosition(null);
    };
  }, [orderId]);

  return { driverPosition };
}
