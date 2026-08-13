/**
 * Подключение к WebSocket и синхронизация кэша заказов (M5.1, M5.2, M5.5).
 *
 * `useRealtimeConnection` держит один сокет на всё приложение: подключается, когда
 * пользователь авторизован и приложение активно, и отключается в фоне, чтобы не тратить
 * батарею. Статус заказа применяется в кэш `getOrder` здесь, на уровне приложения —
 * иначе клиент, ушедший с экрана поиска, так и не узнает, что водитель принял заказ.
 * `useOrderRealtime` дополнительно подписывается на комнату конкретного заказа
 * (позиция водителя, SOS).
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';

import { useSharedDispatch, type SharedDispatch } from '@nurtaxi/shared-core/shared/lib';
import { orderApi } from '@nurtaxi/shared-core/entities/order';
import {
  selectIsAuthenticated,
  type WithSessionState,
} from '@nurtaxi/shared-core/entities/session';

import { realtimeClient } from './realtime-client';
import { RealtimeEvent } from './realtime-events';
import type { DriverLocationEvent, OrderStatusEvent, SosActivatedEvent } from './realtime-events';
import {
  driverPositionReceived,
  realtimeStatusChanged,
  selectRealtimeStatus,
  sosReceived,
  type WithRealtimeState,
} from './realtime.slice';

function applyOrderStatusToCache(dispatch: SharedDispatch, event: OrderStatusEvent): void {
  if (!event.orderId || !event.toStatus) {
    return;
  }
  dispatch(
    orderApi.util.updateQueryData('getOrder', event.orderId, (draft) => {
      draft.status = event.toStatus;
    }),
  );
  // Полная карточка меняется вместе со статусом (водитель, цена, чек).
  dispatch(orderApi.util.invalidateTags([{ type: 'Order', id: event.orderId }]));
}

/** Подключает сокет на время авторизованной сессии. Вызывается один раз в слое `app`. */
export function useRealtimeConnection(): void {
  const dispatch = useSharedDispatch();
  const isAuthenticated = useSelector((state: WithSessionState) => selectIsAuthenticated(state));

  useEffect(() => {
    const unsubscribeStatus = realtimeClient.onStatusChange((status) => {
      dispatch(realtimeStatusChanged(status));
    });

    if (!isAuthenticated) {
      realtimeClient.disconnect();
      return unsubscribeStatus;
    }

    realtimeClient.connect();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        realtimeClient.connect();
      }
    });

    return () => {
      appStateSubscription.remove();
      unsubscribeStatus();
      realtimeClient.disconnect();
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    return realtimeClient.on(RealtimeEvent.OrderStatus, (event) => {
      applyOrderStatusToCache(dispatch, event);
    });
  }, [dispatch, isAuthenticated]);
}

export interface OrderRealtimeHandlers {
  onStatusChange?: (event: OrderStatusEvent) => void;
  onSos?: (event: SosActivatedEvent) => void;
}

/**
 * Подписка на комнату конкретного заказа. Статус в кэш `getOrder` кладёт
 * `useRealtimeConnection`; здесь — комната, позиция водителя и SOS.
 *
 * `realtimeStatus` в зависимостях: после пересоздания сокета нужно заново
 * отправить `subscribe:order`, иначе события локации в комнату не придут.
 */
export function useOrderRealtime(
  orderId: string | null,
  handlers: OrderRealtimeHandlers = {},
): void {
  const dispatch = useSharedDispatch();
  const realtimeStatus = useSelector((state: WithRealtimeState) => selectRealtimeStatus(state));
  const { onStatusChange, onSos } = handlers;

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const unsubscribeRoom = realtimeClient.subscribeToOrder(orderId);

    const handleStatus = (event: OrderStatusEvent) => {
      if (event.orderId !== orderId) {
        return;
      }
      onStatusChange?.(event);
    };

    const handleLocation = (event: DriverLocationEvent) => {
      if (event.orderId !== orderId) {
        return;
      }
      dispatch(driverPositionReceived(event));
    };

    const handleSos = (event: SosActivatedEvent) => {
      if (event.orderId !== orderId) {
        return;
      }
      dispatch(sosReceived(event));
      onSos?.(event);
    };

    const offStatus = realtimeClient.on(RealtimeEvent.OrderStatus, handleStatus);
    const offLocation = realtimeClient.on(RealtimeEvent.DriverLocation, handleLocation);
    const offSos = realtimeClient.on(RealtimeEvent.SosActivated, handleSos);

    return () => {
      offStatus();
      offLocation();
      offSos();
      unsubscribeRoom();
    };
  }, [dispatch, onSos, onStatusChange, orderId, realtimeStatus]);
}
