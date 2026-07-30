import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import {
  REALTIME_REDIS_CHANNEL,
  RealtimeEvent,
  operatorsAllRoom,
  regionRoom,
  type RealtimeEnvelope,
  type RealtimeRoom,
} from './realtime.constants';

type BroadcastHandler = (envelope: RealtimeEnvelope) => void;

/**
 * Redis pub/sub для горизонтального масштабирования WebSocket (Des §10).
 */
@Injectable()
export class RealtimeBroadcastService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeBroadcastService.name);
  private subscriber!: Redis;
  private handler: BroadcastHandler | null = null;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleInit(): void {
    this.subscriber = this.redis.duplicate();
    void this.subscriber.subscribe(REALTIME_REDIS_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      try {
        const envelope = JSON.parse(message) as RealtimeEnvelope;
        this.handler?.(envelope);
      } catch (error) {
        this.logger.warn('Некорректное realtime-сообщение из Redis', error);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber?.quit();
  }

  setHandler(handler: BroadcastHandler): void {
    this.handler = handler;
  }

  async publish(room: RealtimeRoom, event: string, data: Record<string, unknown>): Promise<void> {
    const envelope: RealtimeEnvelope = { room, event, data };
    await this.redis.publish(REALTIME_REDIS_CHANNEL, JSON.stringify(envelope));
    // Локальная доставка для текущего инстанса (pub/sub не эхоит отправителю).
    this.handler?.(envelope);
  }

  /** Рассылка события операторам региона и супер-админам. */
  async publishToStaff(
    regionId: string | null | undefined,
    event: RealtimeEvent | string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = regionId ? { regionId, ...data } : data;
    if (regionId) {
      await this.publish(regionRoom(regionId), event, payload);
    }
    await this.publish(operatorsAllRoom(), event, payload);
  }

  async publishOrderStatus(
    orderId: string,
    clientId: string,
    driverUserId: string | null,
    regionId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = { orderId, ...data };
    await this.publish(`order:${orderId}`, RealtimeEvent.OrderStatus, payload);
    await this.publish(`client:${clientId}`, RealtimeEvent.OrderStatus, payload);
    if (driverUserId) {
      await this.publish(`driver:${driverUserId}`, RealtimeEvent.OrderStatus, payload);
    }
    await this.publishToStaff(regionId, RealtimeEvent.OrderStatus, payload);
  }

  async publishDriverLocation(
    orderId: string,
    clientId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.publish(`order:${orderId}`, 'driver.location', data);
    await this.publish(`client:${clientId}`, 'driver.location', { orderId, ...data });
  }

  async publishSos(
    orderId: string,
    regionId: string,
    clientId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload = { orderId, ...data };
    await this.publish(`order:${orderId}`, RealtimeEvent.SosActivated, payload);
    await this.publish(`client:${clientId}`, RealtimeEvent.SosActivated, payload);
    await this.publishToStaff(regionId, RealtimeEvent.SosActivated, payload);
  }
}
