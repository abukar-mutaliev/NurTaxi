import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const GEO_SEARCH_TTL_SEC = 300;
const KEY_PREFIX = 'geo:search:';

@Injectable()
export class GeoCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private cacheKey(query: string, regionId?: string): string {
    const raw = `${regionId ?? 'all'}:${query}`;
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    return `${KEY_PREFIX}${hash}`;
  }

  async get<T>(query: string, regionId?: string): Promise<T | null> {
    const cached = await this.redis.get(this.cacheKey(query, regionId));
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }

  async set<T>(query: string, regionId: string | undefined, value: T): Promise<void> {
    await this.redis.set(
      this.cacheKey(query, regionId),
      JSON.stringify(value),
      'EX',
      GEO_SEARCH_TTL_SEC,
    );
  }
}
