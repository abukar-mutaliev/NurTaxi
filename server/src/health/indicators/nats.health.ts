import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type { NatsConnection } from 'nats';
import { NATS_CONNECTION } from '../../messaging/messaging.constants';

/**
 * NATS — некритичная зависимость для readiness: его недоступность не должна
 * выводить сервис из ротации (graceful degradation, Des §11). Поэтому индикатор
 * не бросает ошибку, а лишь сообщает статус (`up`/`down`).
 */
@Injectable()
export class NatsHealthIndicator extends HealthIndicator {
  constructor(@Inject(NATS_CONNECTION) private readonly connection: NatsConnection | null) {
    super();
  }

  check(key: string): HealthIndicatorResult {
    const isUp = this.connection !== null && !this.connection.isClosed();
    return this.getStatus(key, isUp);
  }
}
