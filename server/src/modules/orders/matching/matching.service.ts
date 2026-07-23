import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import {
  DriverLocationService,
  type DriverGeoEntry,
} from '../../drivers/location/driver-location.service';

const OFFER_KEY_PREFIX = 'order:offer:';
const OFFER_TTL_SEC = 30;
const SEARCH_RADIUS_KM = 10;
const MAX_CANDIDATES = 20;

export interface MatchOffer {
  orderId: string;
  driverId: string;
  candidateIndex: number;
  candidates: string[];
  expiresAt: string;
}

export interface RankedCandidate extends DriverGeoEntry {
  score: number;
}

/**
 * Подбор водителя: радиус-поиск, ранжирование, тайм-аут предложения (Des §6, Req §15.3).
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly driverLocation: DriverLocationService,
  ) {}

  async findCandidates(
    regionId: string,
    pickupLat: number,
    pickupLng: number,
    onlineDriverIds: Set<string>,
  ): Promise<RankedCandidate[]> {
    const nearby = await this.driverLocation.findNearby(
      regionId,
      pickupLat,
      pickupLng,
      SEARCH_RADIUS_KM,
      MAX_CANDIDATES,
    );

    const available = nearby.filter((d) => onlineDriverIds.has(d.driverId));
    return available
      .map((candidate) => ({
        ...candidate,
        score: this.rankScore(candidate),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /** Ранжирование: ближе и выше рейтинг — лучше (избранные — Фаза 8). */
  private rankScore(candidate: DriverGeoEntry): number {
    const distanceKm = (candidate.distanceM ?? 0) / 1000;
    const distanceScore = Math.max(0, 100 - distanceKm * 10);
    const ratingScore = candidate.rating * 10;
    return distanceScore + ratingScore;
  }

  async createOffer(orderId: string, candidates: RankedCandidate[]): Promise<MatchOffer | null> {
    if (candidates.length === 0) return null;

    const driverIds = candidates.map((c) => c.driverId);
    const offer: MatchOffer = {
      orderId,
      driverId: driverIds[0],
      candidateIndex: 0,
      candidates: driverIds,
      expiresAt: new Date(Date.now() + OFFER_TTL_SEC * 1000).toISOString(),
    };

    await this.redis.set(
      `${OFFER_KEY_PREFIX}${orderId}`,
      JSON.stringify(offer),
      'EX',
      OFFER_TTL_SEC,
    );
    return offer;
  }

  async getOffer(orderId: string): Promise<MatchOffer | null> {
    const raw = await this.redis.get(`${OFFER_KEY_PREFIX}${orderId}`);
    if (!raw) return null;
    return JSON.parse(raw) as MatchOffer;
  }

  async clearOffer(orderId: string): Promise<void> {
    await this.redis.del(`${OFFER_KEY_PREFIX}${orderId}`);
  }

  /** Следующий кандидат при тайм-ауте/отказе. */
  async advanceOffer(orderId: string): Promise<MatchOffer | null> {
    const current = await this.getOffer(orderId);
    if (!current) return null;

    const nextIndex = current.candidateIndex + 1;
    if (nextIndex >= current.candidates.length) {
      await this.clearOffer(orderId);
      return null;
    }

    const offer: MatchOffer = {
      ...current,
      driverId: current.candidates[nextIndex],
      candidateIndex: nextIndex,
      expiresAt: new Date(Date.now() + OFFER_TTL_SEC * 1000).toISOString(),
    };

    await this.redis.set(
      `${OFFER_KEY_PREFIX}${orderId}`,
      JSON.stringify(offer),
      'EX',
      OFFER_TTL_SEC,
    );
    return offer;
  }

  canAcceptOffer(offer: MatchOffer | null, driverId: string): boolean {
    if (!offer) return false;
    if (new Date(offer.expiresAt) < new Date()) return false;
    return offer.driverId === driverId;
  }
}
