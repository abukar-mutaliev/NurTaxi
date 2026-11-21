import { Injectable, Logger } from '@nestjs/common';
import {
  RealtimeEvent,
  clientRoom,
  driverRoom,
  operatorsAllRoom,
  orderRoom,
  regionRoom,
  type RealtimeEnvelope,
  type RealtimeRoom,
} from './realtime.constants';

type BroadcastHandler = (envelope: RealtimeEnvelope) => void;

/**
 * Рассылка событий в комнаты WebSocket (Des §10).
 *
 * Между инстансами событие разносит Redis-адаптер Socket.IO, подключённый в шлюзе:
 * `server.to(...).emit(...)` доходит до сокетов на всех инстансах. Раньше сервис вдобавок
 * публиковал событие в собственный канал Redis и сам же на него был подписан. Redis
 * возвращает сообщение и отправителю (подписчик — отдельное соединение), поэтому
 * обработчик срабатывал дважды на одном инстансе и ещё по разу на каждом соседнем, а
 * адаптер разносил каждое срабатывание по всем: получатель видел событие минимум дважды.
 *
 * Комнаты одного события передаются списком: Socket.IO шлёт сокету событие один раз,
 * даже если он состоит в нескольких из них (клиент сидит и в `client:`, и в `order:`).
 */
@Injectable()
export class RealtimeBroadcastService {
  private readonly logger = new Logger(RealtimeBroadcastService.name);
  private handler: BroadcastHandler | null = null;

  /** Шлюз отдаёт сюда отправку в сокеты, когда поднимется. */
  setHandler(handler: BroadcastHandler): void {
    this.handler = handler;
  }

  /**
   * Возвращает `Promise`, хотя отправка синхронная: вызывающий код не должен зависеть от
   * того, каким транспортом событие уходит.
   */
  publish(
    rooms: RealtimeRoom | readonly RealtimeRoom[],
    event: RealtimeEvent | string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const list = [...new Set(typeof rooms === 'string' ? [rooms] : rooms)];
    if (list.length === 0) {
      return Promise.resolve();
    }
    if (!this.handler) {
      this.logger.warn(`Шлюз WebSocket ещё не поднят, событие ${event} не отправлено`);
      return Promise.resolve();
    }

    try {
      this.handler({ rooms: list, event, data });
    } catch (error) {
      // Уведомление — не часть операции: сбой рассылки не должен откатывать смену статуса.
      this.logger.warn(`Не удалось разослать событие ${event}`, error);
    }
    return Promise.resolve();
  }

  /** Рассылка события операторам региона и супер-админам. */
  async publishToStaff(
    regionId: string | null | undefined,
    event: RealtimeEvent | string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = regionId ? { regionId, ...data } : data;
    const rooms = regionId ? [regionRoom(regionId), operatorsAllRoom()] : [operatorsAllRoom()];
    await this.publish(rooms, event, payload);
  }

  async publishOrderStatus(
    orderId: string,
    clientId: string,
    driverUserId: string | null,
    regionId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = { orderId, ...data };
    const participants = [orderRoom(orderId), clientRoom(clientId)];
    if (driverUserId) {
      participants.push(driverRoom(driverUserId));
    }
    await this.publish(participants, RealtimeEvent.OrderStatus, payload);
    await this.publishToStaff(regionId, RealtimeEvent.OrderStatus, payload);
  }

  /**
   * Предложение заказа конкретному водителю (Req §15.3, Des §6).
   * Уходит в личную комнату водителя — заказ видит только тот, чья сейчас очередь.
   */
  async publishOrderOffer(driverUserId: string, data: Record<string, unknown>): Promise<void> {
    await this.publish(driverRoom(driverUserId), RealtimeEvent.OrderOffer, data);
  }

  async publishDriverLocation(
    orderId: string,
    clientId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.publish([orderRoom(orderId), clientRoom(clientId)], RealtimeEvent.DriverLocation, {
      orderId,
      ...data,
    });
  }

  async publishSos(
    orderId: string,
    regionId: string,
    clientId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = { orderId, ...data };
    await this.publish(
      [orderRoom(orderId), clientRoom(clientId)],
      RealtimeEvent.SosActivated,
      payload,
    );
    await this.publishToStaff(regionId, RealtimeEvent.SosActivated, payload);
  }
}
