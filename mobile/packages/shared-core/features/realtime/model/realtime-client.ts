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
type SocketEventListener = (...args: unknown[]) => void;

let socket: AppSocket | null = null;
let status: RealtimeStatus = 'idle';
const statusListeners = new Set<StatusListener>();
/** Комнаты заказов, на которые нужно переподписаться после reconnect. */
const subscribedOrders = new Set<string>();
/**
 * Обработчики прикладных событий живут здесь, а не только на текущем сокете.
 *
 * `connect()` при обрыве создаёт новый `io()` и снимает слушателей со старого.
 * Если вешать `socket.on(...)` без реестра, экран заказа перестаёт получать
 * `order.status` — клиент так и остаётся на «Ищем водителя», хотя сокет уже
 * снова «подключён» и поллинг из-за этого выключен.
 */
const eventListeners = new Map<keyof ServerToClientEvents, Set<SocketEventListener>>();

/**
 * Повторные попытки после отказа на хендшейке (M5.5).
 *
 * Socket.IO сам переподключается при обрыве связи, но не тогда, когда сервер отклонил
 * подключение в middleware — а именно это происходит с протухшим access-токеном (TTL 15
 * минут). Без своих попыток сокет остаётся мёртвым до перезапуска приложения: REST
 * продолжает работать, обновляя токены, а события к водителю не приходят вовсе.
 */
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30_000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
/** Подписка на смену токена оформляется один раз за жизнь модуля. */
let tokenSubscription: (() => void) | null = null;

function clearRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retryAttempt = 0;
}

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

function bindEventListeners(active: AppSocket): void {
  eventListeners.forEach((handlers, event) => {
    handlers.forEach((handler) => {
      active.on(event, handler as never);
    });
  });
}

/**
 * Планирует повторную попытку с нарастающей задержкой. Токен читается заново в момент
 * попытки: к тому времени REST мог уже обновить его после `401`.
 */
function scheduleRetry(): void {
  if (retryTimer) {
    return;
  }

  const delay = Math.min(RETRY_BASE_MS * 2 ** retryAttempt, RETRY_MAX_MS);
  retryAttempt += 1;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    // Токена нет — пользователь вышел; молча прекращаем, попытки возобновит `connect`.
    if (!tokenStorage.getAccessToken()) {
      return;
    }
    realtimeClient.connect();
  }, delay);
}

/**
 * Свежий токен — повод попробовать немедленно, не дожидаясь очередной задержки.
 * Именно это вытаскивает соединение из мёртвого состояния после протухания токена.
 */
function watchTokenChanges(): void {
  tokenSubscription ??= tokenStorage.onAccessTokenChange((accessToken) => {
    if (!accessToken) {
      return;
    }
    if (socket?.connected) {
      return;
    }
    clearRetry();
    realtimeClient.connect();
  });
}

export const realtimeClient = {
  connect(): AppSocket | null {
    // Подписка на токен нужна и тогда, когда подключиться сейчас нечем: она поднимет
    // соединение, как только REST добудет свежий токен.
    watchTokenChanges();

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
      clearRetry();
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
    /**
     * `active === true` — транспортная ошибка, Socket.IO повторит сам.
     * `active === false` — сервер отклонил подключение (протухший или неверный токен),
     * и без своей попытки соединение больше не поднимется.
     */
    next.on('connect_error', () => {
      setStatus('error');
      if (!next.active) {
        scheduleRetry();
      }
    });

    bindEventListeners(next);
    socket = next;
    return next;
  },

  disconnect(): void {
    // Отписку от токена намеренно не снимаем: выход из сессии её обнулит сам (токена нет),
    // а повторный вход снова поднимет соединение без лишней перерегистрации.
    clearRetry();
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
   *
   * Слушатель хранится в реестре и заново вешается на каждый новый сокет:
   * иначе после `connect()` с пересозданием соединения обработчики пропадают,
   * а хук, который их ставил, об этом не узнаёт.
   */
  on<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]): () => void {
    const listener = handler as SocketEventListener;
    let handlers = eventListeners.get(event);
    if (!handlers) {
      handlers = new Set();
      eventListeners.set(event, handlers);
    }
    handlers.add(listener);
    socket?.on(event, listener as never);
    return () => {
      handlers?.delete(listener);
      socket?.off(event, listener as never);
    };
  },
};
