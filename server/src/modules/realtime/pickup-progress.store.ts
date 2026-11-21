import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

/** Что водитель сообщил о подаче машины. */
export interface PickupProgress {
  /** Строка «до клиента» — та же, что на экране водителя. */
  eta?: string;
  /** Линия маршрута подачи. */
  route?: string;
}

/** `undefined` — оставить как есть, `null` — стереть. */
export interface PickupProgressUpdate {
  eta?: string | null;
  route?: string | null;
}

const KEY_PREFIX = 'order:pickup:';
/**
 * Подача длится минуты. Срок жизни — страховка на случай, когда водитель так и не сообщил,
 * что она закончилась (заказ отменён, приложение закрыто): запись исчезнет сама.
 */
const TTL_SEC = 2 * 60 * 60;

const FIELDS = ['eta', 'route'] as const;

/**
 * Время «до клиента» и линия подачи по заказу (Req §15.1).
 *
 * В Redis, а не в памяти процесса: точку водителя принимает один инстанс, а клиент
 * подписывается на заказ через другой — и раньше получал снимок без линии. Перезапуск
 * сервера стирал данные всех текущих подач, а записи завершённых заказов не удалялись.
 */
@Injectable()
export class PickupProgressStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async save(orderId: string, update: PickupProgressUpdate): Promise<void> {
    const set: Record<string, string> = {};
    const remove: string[] = [];
    for (const field of FIELDS) {
      const value = update[field];
      if (typeof value === 'string') {
        set[field] = value;
      } else if (value === null) {
        remove.push(field);
      }
    }

    const hasSet = Object.keys(set).length > 0;
    if (!hasSet && remove.length === 0) {
      return;
    }

    const key = this.key(orderId);
    const pipeline = this.redis.pipeline();
    if (hasSet) {
      pipeline.hset(key, set);
      pipeline.expire(key, TTL_SEC);
    }
    if (remove.length > 0) {
      pipeline.hdel(key, ...remove);
    }

    // `exec` не бросает ошибку отдельной команды — она лежит в результате.
    const results = await pipeline.exec();
    const failed = results?.find(([error]) => error);
    if (failed?.[0]) {
      throw failed[0];
    }
  }

  /** Отдельно от линии: строка нужна в каждом событии, а линия весит килобайты. */
  async readEta(orderId: string): Promise<string | undefined> {
    return (await this.redis.hget(this.key(orderId), 'eta')) ?? undefined;
  }

  async read(orderId: string): Promise<PickupProgress> {
    const stored = await this.redis.hgetall(this.key(orderId));
    return {
      ...(stored.eta ? { eta: stored.eta } : {}),
      ...(stored.route ? { route: stored.route } : {}),
    };
  }

  private key(orderId: string): string {
    return `${KEY_PREFIX}${orderId}`;
  }
}
