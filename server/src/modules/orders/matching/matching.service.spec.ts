import type Redis from 'ioredis';
import { MatchingService } from './matching.service';
import type { DriverLocationService } from '../../drivers/location/driver-location.service';

function memoryRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(
      async (key: string, value: string, _px: string, _ttl: number, nx?: string) => {
        if (nx === 'NX' && store.has(key)) {
          return null;
        }
        store.set(key, value);
        return 'OK';
      },
    ),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
  };
}

describe('MatchingService search window', () => {
  it('не считает поиск истёкшим в момент создания заказа', async () => {
    const redis = memoryRedis();
    const service = new MatchingService(
      redis as unknown as Redis,
      {} as DriverLocationService,
    );

    await expect(service.isSearchExpired('order-1', 1_000)).resolves.toBe(false);
    await expect(service.isSearchExpired('order-1', 1_000 + 60_000)).resolves.toBe(false);
  });

  it('закрывает поиск только после окна ожидания', async () => {
    const redis = memoryRedis();
    const service = new MatchingService(
      redis as unknown as Redis,
      {} as DriverLocationService,
    );
    const started = 5_000;

    await service.isSearchExpired('order-1', started);

    await expect(service.isSearchExpired('order-1', started + 3 * 60 * 1000 - 1)).resolves.toBe(
      false,
    );
    await expect(service.isSearchExpired('order-1', started + 3 * 60 * 1000)).resolves.toBe(true);
  });
});
