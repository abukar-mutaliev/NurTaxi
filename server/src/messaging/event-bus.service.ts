import { Inject, Injectable, Logger } from '@nestjs/common';
import { JSONCodec, type NatsConnection } from 'nats';
import { NATS_CONNECTION } from './messaging.constants';

/**
 * Абстракция над брокером событий (NATS JetStream, Des §3, §10).
 * Доменные модули публикуют события (`order.*`, `payment.*`, `sos.activated` и т.д.)
 * через этот сервис, не завязываясь на конкретный брокер — при росте нагрузки
 * реализацию можно заменить на Kafka без изменения вызывающего кода.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly codec = JSONCodec();

  constructor(@Inject(NATS_CONNECTION) private readonly connection: NatsConnection | null) {}

  publish<T>(subject: string, payload: T): void {
    if (!this.connection) {
      this.logger.warn(`NATS недоступен, событие "${subject}" не опубликовано`);
      return;
    }
    this.connection.publish(subject, this.codec.encode(payload));
  }

  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }
}
