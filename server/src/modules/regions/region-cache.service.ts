import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const REGION_TTL_SEC = 300;
const KEY_PREFIX = 'region:';

@Injectable()
export class RegionCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(id: string): string {
    return `${KEY_PREFIX}${id}`;
  }

  async get<T>(id: string): Promise<T | null> {
    const cached = await this.redis.get(this.key(id));
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }

  async set<T>(id: string, value: T): Promise<void> {
    await this.redis.set(this.key(id), JSON.stringify(value), 'EX', REGION_TTL_SEC);
  }

  async invalidate(id: string): Promise<void> {
    await this.redis.del(this.key(id));
  }
}
