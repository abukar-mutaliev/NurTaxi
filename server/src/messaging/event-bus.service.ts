import { Inject, Injectable, Logger } from '@nestjs/common';
import { JSONCodec, type NatsConnection } from 'nats';
import { NATS_CONNECTION } from './messaging.constants';

type LocalHandler = (payload: unknown) => void | Promise<void>;

/**
 * Абстракция над брокером событий (NATS JetStream, Des §3, §10).
 * Доменные модули публикуют события (`order.*`, `payment.*`, `sos.activated` и т.д.)
 * через этот сервис, не завязываясь на конкретный брокер — при росте нагрузки
 * реализацию можно заменить на Kafka без изменения вызывающего кода.
 *
 * Локальные подписчики (in-process) используются для уведомлений и side-effects (Фаза 8).
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly codec = JSONCodec();
  private readonly localHandlers = new Map<string, Set<LocalHandler>>();

  constructor(@Inject(NATS_CONNECTION) private readonly connection: NatsConnection | null) {}

  subscribeLocal<T>(subject: string, handler: (payload: T) => void | Promise<void>): void {
    if (!this.localHandlers.has(subject)) {
      this.localHandlers.set(subject, new Set());
    }
    this.localHandlers.get(subject)!.add(handler as LocalHandler);
  }

  publish<T>(subject: string, payload: T): void {
    void this.dispatchLocal(subject, payload);

    if (!this.connection) {
      this.logger.warn(`NATS недоступен, событие "${subject}" не опубликовано`);
      return;
    }
    this.connection.publish(subject, this.codec.encode(payload));
  }

  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }

  private async dispatchLocal(subject: string, payload: unknown): Promise<void> {
    const handlers = this.localHandlers.get(subject);
    if (!handlers?.size) return;

    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        this.logger.warn(
          `Local handler failed for "${subject}": ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
