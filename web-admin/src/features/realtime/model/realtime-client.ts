import { io, type Socket } from 'socket.io-client';
import { appConfig } from '@/shared/config';
import { tokenStorage } from '@/shared/lib/token-storage';
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
const subscribedOrders = new Set<string>();

function setStatus(next: RealtimeStatus): void {
  if (status === next) return;
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
    if (!token) return null;
    if (socket?.connected) return socket;

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
      const fresh = tokenStorage.getAccessToken();
      if (fresh) next.auth = { token: fresh };
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

  subscribeToOrder(orderId: string): () => void {
    subscribedOrders.add(orderId);
    if (socket?.connected) {
      socket.emit(RealtimeEvent.SubscribeOrder, { orderId });
    }
    return () => subscribedOrders.delete(orderId);
  },

  on<E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E],
  ): () => void {
    const listener = handler as (...args: unknown[]) => void;
    socket?.on(event, listener as never);
    return () => socket?.off(event, listener as never);
  },
};
