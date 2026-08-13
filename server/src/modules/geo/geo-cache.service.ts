import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const GEO_SEARCH_TTL_SEC = 300;
const GEO_ROUTE_TTL_SEC = 60;
const KEY_PREFIX = 'geo:search:';
const ROUTE_PREFIX = 'geo:route:';

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

  /**
   * Кэш дорожного маршрута. Координаты округляются до ~11 м, чтобы соседние GPS-тики
   * попадали в один ключ и не дёргали OSRM на каждый шаг машины.
   */
  async getRoute<T>(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<T | null> {
    const cached = await this.redis.get(this.routeCacheKey(originLat, originLng, destLat, destLng));
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }

  async setRoute<T>(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    value: T,
  ): Promise<void> {
    await this.redis.set(
      this.routeCacheKey(originLat, originLng, destLat, destLng),
      JSON.stringify(value),
      'EX',
      GEO_ROUTE_TTL_SEC,
    );
  }

  private routeCacheKey(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): string {
    const raw = [originLat, originLng, destLat, destLng].map((value) => value.toFixed(4)).join(':');
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    return `${ROUTE_PREFIX}${hash}`;
  }
}
