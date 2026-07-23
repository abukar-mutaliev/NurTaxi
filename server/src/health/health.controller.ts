import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { MetricsService } from '../observability/metrics/metrics.service';
import { RedisHealthIndicator } from './indicators/redis.health';
import { NatsHealthIndicator } from './indicators/nats.health';

/**
 * Пробы состояния сервиса для Kubernetes (Des §11, Req §18):
 * - /health/live  — liveness: процесс жив (без внешних зависимостей);
 * - /health/ready — readiness: готов принимать трафик (БД и Redis доступны).
 * Метрика service_ready обновляется для SLI доступности (Req §10.1).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly nats: NatsHealthIndicator,
    private readonly metrics: MetricsService,
  ) {}

  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  async readiness() {
    try {
      const result = await this.health.check([
        () => this.db.pingCheck('database', { timeout: 3000 }),
        () => this.redis.pingCheck('redis'),
        () => Promise.resolve(this.nats.check('nats')),
      ]);
      this.metrics.setReady(true);
      return result;
    } catch (error) {
      this.metrics.setReady(false);
      throw error;
    }
  }
}
