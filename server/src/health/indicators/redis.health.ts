import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      const isHealthy = pong === 'PONG';
      const result = this.getStatus(key, isHealthy);
      if (isHealthy) {
        return result;
      }
      throw new HealthCheckError('Redis не отвечает', result);
    } catch (err) {
      throw new HealthCheckError(
        'Redis недоступен',
        this.getStatus(key, false, {
          message: (err as Error).message,
        }),
      );
    }
  }
}
