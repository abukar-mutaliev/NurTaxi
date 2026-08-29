import type { AddressSuggestion } from '@nurtaxi/shared-core/shared/model';

import { resolvePointAddress, type ResolvePointAddressDeps } from './resolve-point-address';

const point = { lat: 43.197, lng: 44.8149, address: 'Моё местоположение' };

function suggestion(overrides: Partial<AddressSuggestion> = {}): AddressSuggestion {
  return {
    id: '1',
    title: 'ул. Московская',
    subtitle: 'г. Назрань',
    address: 'г. Назрань, ул. Московская, 12',
    lat: 43.1971,
    lng: 44.815,
    ...overrides,
  };
}

describe('resolvePointAddress', () => {
  it('берёт улицу из /geo/reverse, если эндпоинт отвечает', async () => {
    const reverseViaApi = jest.fn().mockResolvedValue('г. Назрань, ул. Московская, 12');
    const search = jest.fn();
    const fetchImpl = jest.fn();

    await expect(
      resolvePointAddress(point, [], { reverseViaApi, search, fetchImpl, cache: new Map() }),
    ).resolves.toBe('г. Назрань, ул. Московская, 12');

    expect(search).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('после 404 /geo/reverse берёт улицу из Nominatim', async () => {
    const deps: ResolvePointAddressDeps = {
      reverseViaApi: jest.fn().mockResolvedValue(null),
      search: jest.fn(),
      cache: new Map(),
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: 'Россия, Республика Ингушетия, Назрань, улица Х.Б. Муталиева, 1',
          address: {
            city: 'Назрань',
            road: 'улица Х.Б. Муталиева',
            house_number: '1',
          },
        }),
      }),
    };

    await expect(resolvePointAddress(point, [], deps)).resolves.toBe(
      'Назрань, улица Х.Б. Муталиева, 1',
    );
    expect(deps.search).not.toHaveBeenCalled();
  });

  it('не возвращает GPS-подпись и не берёт подсказку с координатами точки запроса', async () => {
    const deps: ResolvePointAddressDeps = {
      reverseViaApi: jest.fn().mockResolvedValue('Моё местоположение'),
      cache: new Map(),
      search: jest.fn().mockResolvedValue([
        suggestion({ lat: point.lat, lng: point.lng }),
        suggestion({
          address: 'г. Карабулак, ул. Осканова, 8',
          lat: 43.305,
          lng: 44.909,
        }),
      ]),
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    };

    await expect(resolvePointAddress(point, [], deps)).resolves.toBeNull();
  });

  it('из поиска берёт ближайшую улицу с реальными координатами', async () => {
    const deps: ResolvePointAddressDeps = {
      reverseViaApi: jest.fn().mockResolvedValue(null),
      cache: new Map(),
      search: jest.fn().mockResolvedValue([suggestion()]),
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    };

    await expect(resolvePointAddress(point, [], deps)).resolves.toBe(
      'г. Назрань, ул. Московская, 12',
    );
  });
});
