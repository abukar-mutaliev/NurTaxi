import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const SUB_KEY_PREFIX = 'ws:subs:';
const SUB_TTL_SEC = 86_400;

/**
 * Состояние подписок WebSocket в Redis (Des §10).
 */
@Injectable()
export class WsSubscriptionService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(socketId: string): string {
    return `${SUB_KEY_PREFIX}${socketId}`;
  }

  async add(socketId: string, room: string): Promise<void> {
    await this.redis.sadd(this.key(socketId), room);
    await this.redis.expire(this.key(socketId), SUB_TTL_SEC);
  }

  async removeSocket(socketId: string): Promise<void> {
    await this.redis.del(this.key(socketId));
  }

  async list(socketId: string): Promise<string[]> {
    return this.redis.smembers(this.key(socketId));
  }
}
