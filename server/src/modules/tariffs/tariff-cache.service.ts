import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const TARIFF_TTL_SEC = 120;
const KEY_PREFIX = 'tariff:effective:';

@Injectable()
export class TariffCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(regionId: string, tariffId?: string): string {
    return `${KEY_PREFIX}${regionId}:${tariffId ?? 'default'}`;
  }

  async get<T>(regionId: string, tariffId?: string): Promise<T | null> {
    const cached = await this.redis.get(this.key(regionId, tariffId));
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }

  async set<T>(regionId: string, tariffId: string | undefined, value: T): Promise<void> {
    await this.redis.set(this.key(regionId, tariffId), JSON.stringify(value), 'EX', TARIFF_TTL_SEC);
  }

  async invalidateRegion(regionId: string): Promise<void> {
    const pattern = `${KEY_PREFIX}${regionId}:*`;
    const stream = this.redis.scanStream({ match: pattern, count: 50 });
    for await (const keys of stream) {
      const batch = keys as string[];
      if (batch.length) await this.redis.del(...batch);
    }
  }
}
