import type Redis from 'ioredis';
import { PickupProgressStore } from './pickup-progress.store';

/** Хэши Redis в памяти — ровно те команды, которыми пользуется хранилище. */
function createRedis() {
  const hashes = new Map<string, Record<string, string>>();
  const ttl = new Map<string, number>();

  const hset = (key: string, values: Record<string, string>) => {
    hashes.set(key, { ...hashes.get(key), ...values });
  };
  const hdel = (key: string, ...fields: string[]) => {
    const hash = { ...hashes.get(key) };
    fields.forEach((field) => delete hash[field]);
    hashes.set(key, hash);
  };

  const redis = {
    hget: async (key: string, field: string) => hashes.get(key)?.[field] ?? null,
    hgetall: async (key: string) => ({ ...hashes.get(key) }),
    pipeline: () => {
      const commands: Array<() => void> = [];
      const chain = {
        exec: async () => commands.map((run) => [null, run()] as [null, unknown]),
        expire: (key: string, seconds: number) => {
          commands.push(() => ttl.set(key, seconds));
          return chain;
        },
        hdel: (key: string, ...fields: string[]) => {
          commands.push(() => hdel(key, ...fields));
          return chain;
        },
        hset: (key: string, values: Record<string, string>) => {
          commands.push(() => hset(key, values));
          return chain;
        },
      };
      return chain;
    },
  };

  return { redis: redis as unknown as Redis, ttl };
}

describe('PickupProgressStore', () => {
  it('помнит время и линию подачи по заказу', async () => {
    const store = new PickupProgressStore(createRedis().redis);

    await store.save('order-1', { eta: '5 мин', route: 'abc' });

    await expect(store.read('order-1')).resolves.toEqual({ eta: '5 мин', route: 'abc' });
    await expect(store.readEta('order-1')).resolves.toBe('5 мин');
    await expect(store.read('order-2')).resolves.toEqual({});
  });

  it('пропущенное поле не затирает сохранённое', async () => {
    const store = new PickupProgressStore(createRedis().redis);

    await store.save('order-1', { eta: '5 мин', route: 'abc' });
    await store.save('order-1', { eta: '4 мин' });

    await expect(store.read('order-1')).resolves.toEqual({ eta: '4 мин', route: 'abc' });
  });

  it('null стирает поле', async () => {
    const store = new PickupProgressStore(createRedis().redis);

    await store.save('order-1', { eta: '5 мин', route: 'abc' });
    await store.save('order-1', { eta: null, route: null });

    await expect(store.read('order-1')).resolves.toEqual({});
    await expect(store.readEta('order-1')).resolves.toBeUndefined();
  });

  it('ставит записи срок жизни, чтобы брошенная подача не осталась навсегда', async () => {
    const { redis, ttl } = createRedis();
    const store = new PickupProgressStore(redis);

    await store.save('order-1', { eta: '5 мин' });

    expect(ttl.get('order:pickup:order-1')).toBeGreaterThan(0);
  });

  it('без изменений в Redis не ходит', async () => {
    const { redis } = createRedis();
    const pipeline = jest.spyOn(redis, 'pipeline');
    const store = new PickupProgressStore(redis);

    await store.save('order-1', {});

    expect(pipeline).not.toHaveBeenCalled();
  });
});
