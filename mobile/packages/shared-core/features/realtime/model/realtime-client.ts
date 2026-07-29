/**
 * Клиент реального времени (M5.1).
 *
 * Один сокет на приложение. Переподключение с экспоненциальной задержкой делает сам
 * Socket.IO; наша задача — подставить свежий access-токен в хендшейк и восстановить
 * подписки на комнаты заказов после обрыва связи (`M5.5`).
 */
import { io, type Socket } from 'socket.io-client';

import { appConfig } from '@nurtaxi/shared-core/shared/config';
import { tokenStorage } from '@nurtaxi/shared-core/shared/lib';
import {
  RealtimeEvent,
  type ClientToServerEvents,
  type RealtimeStatus,
  type ServerToClientEvents,
} from './realtime-events';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type StatusListener = (status: RealtimeStatus) => void;

let socket: AppSocket | null = null;
let status: RealtimeStatus = 'idle';
const statusListeners = new Set<StatusListener>();
/** Комнаты заказов, на которые нужно переподписаться после reconnect. */
const subscribedOrders = new Set<string>();

function setStatus(next: RealtimeStatus): void {
  if (status === next) {
    return;
  }
  status = next;
  statusListeners.forEach((listener) => listener(next));
}

function resubscribeAll(active: AppSocket): void {
  subscribedOrders.forEach((orderId) => {
    active.emit(RealtimeEvent.SubscribeOrder, { orderId });
  });
}

export const realtimeClient = {
  connect(): AppSocket | null {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      return null;
    }
    if (socket?.connected) {
      return socket;
    }

    socket?.removeAllListeners();
    socket?.disconnect();

    setStatus('connecting');
    const next: AppSocket = io(appConfig.wsUrl, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15_000,
      randomizationFactor: 0.5,
      timeout: 10_000,
    });

    next.on('connect', () => {
      setStatus('connected');
      resubscribeAll(next);
    });
    next.on('disconnect', () => setStatus('reconnecting'));
    next.io.on('reconnect_attempt', () => {
      setStatus('reconnecting');
      // Токен мог обновиться, пока связи не было.
      const fresh = tokenStorage.getAccessToken();
      if (fresh) {
        next.auth = { token: fresh };
      }
    });
    next.on('connect_error', () => setStatus('error'));

    socket = next;
    return next;
  },

  disconnect(): void {
    subscribedOrders.clear();
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
    setStatus('idle');
  },

  getSocket(): AppSocket | null {
    return socket;
  },

  getStatus(): RealtimeStatus {
    return status;
  },

  onStatusChange(listener: StatusListener): () => void {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },

  /** Подписка на комнату конкретного заказа. Возвращает функцию отписки. */
  subscribeToOrder(orderId: string): () => void {
    subscribedOrders.add(orderId);
    if (socket?.connected) {
      socket.emit(RealtimeEvent.SubscribeOrder, { orderId });
    }
    return () => {
      subscribedOrders.delete(orderId);
    };
  },

  /** Передача позиции водителя (`M8.2`). Если сокета нет, вызывающий код шлёт REST-фоллбэк. */
  sendDriverLocation(lat: number, lng: number): boolean {
    if (!socket?.connected) {
      return false;
    }
    socket.emit(RealtimeEvent.DriverLocation, { lat, lng });
    return true;
  },

  /**
   * Подписка на серверное событие. Возвращает функцию отписки.
   * Приведение типов нужно потому, что типы socket.io не сводят обобщённый ключ `E`
   * к конкретной сигнатуре обработчика.
   */
  on<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]): () => void {
    const listener = handler as (...args: unknown[]) => void;
    socket?.on(event, listener as never);
    return () => {
      socket?.off(event, listener as never);
    };
  },
};
