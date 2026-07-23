import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.constants';

const GEO_KEY_PREFIX = 'drivers:geo:';

export interface DriverGeoEntry {
  driverId: string;
  userId: string;
  lat: number;
  lng: number;
  rating: number;
  distanceM?: number;
}

/**
 * Позиции водителей в Redis GEO (Des §6.2).
 * Обновление через HTTP до WebSocket-сервиса (Фаза 5).
 */
@Injectable()
export class DriverLocationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private geoKey(regionId: string): string {
    return `${GEO_KEY_PREFIX}${regionId}`;
  }

  async updateLocation(
    regionId: string,
    driverId: string,
    userId: string,
    lat: number,
    lng: number,
    rating: number,
  ): Promise<void> {
    await this.redis.geoadd(this.geoKey(regionId), lng, lat, driverId);
    await this.redis.hset(`driver:meta:${driverId}`, {
      userId,
      rating: String(rating),
      regionId,
      updatedAt: new Date().toISOString(),
    });
  }

  async removeLocation(regionId: string, driverId: string): Promise<void> {
    await this.redis.zrem(this.geoKey(regionId), driverId);
    await this.redis.del(`driver:meta:${driverId}`);
  }

  async findNearby(
    regionId: string,
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number,
  ): Promise<DriverGeoEntry[]> {
    const raw = await this.redis.georadius(
      this.geoKey(regionId),
      lng,
      lat,
      radiusKm,
      'km',
      'WITHDIST',
      'WITHCOORD',
      'ASC',
      'COUNT',
      limit,
    );

    if (!raw.length) return [];

    const entries: DriverGeoEntry[] = [];

    for (const item of raw) {
      const [driverId, distanceKm, coords] = item as [string, string, [string, string]];
      const meta = await this.redis.hgetall(`driver:meta:${driverId}`);
      if (!meta.userId) continue;

      entries.push({
        driverId,
        userId: meta.userId,
        lat: Number.parseFloat(coords[1]),
        lng: Number.parseFloat(coords[0]),
        rating: Number.parseFloat(meta.rating ?? '5'),
        distanceM: Math.round(Number.parseFloat(distanceKm) * 1000),
      });
    }

    return entries;
  }
}
