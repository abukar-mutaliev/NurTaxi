import { ConfigService } from '@nestjs/config';

import { StubRoutingProvider } from './stub-routing.provider';
import { YandexMapProvider } from './yandex-map.provider';

describe('YandexMapProvider', () => {
  const routingProvider = new StubRoutingProvider();

  function createProvider(keys: { geosuggest?: string; geocoder?: string }) {
    const config = {
      get: () => ({
        provider: 'yandex',
        yandexGeosuggestApiKey: keys.geosuggest ?? '',
        yandexGeocoderApiKey: keys.geocoder ?? '',
        geosuggestUrl: 'https://suggest-maps.yandex.ru/v1/suggest',
        geocoderUrl: 'https://geocode-maps.yandex.ru/v1/',
        locale: 'ru_RU',
        requestTimeoutMs: 5000,
      }),
    } as unknown as ConfigService;

    return new YandexMapProvider(config, routingProvider);
  }

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('search: Geosuggest + Geocoder возвращает точные координаты по uri', async () => {
    const provider = createProvider({
      geosuggest: 'test-geosuggest-key',
      geocoder: 'test-geocoder-key',
    });

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              title: { text: 'ул. Московская' },
              subtitle: { text: 'г. Назрань' },
              address: { formatted_address: 'г. Назрань, ул. Московская' },
              uri: 'ymapsbm1://geo?data=test',
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            GeoObjectCollection: {
              featureMember: [
                {
                  GeoObject: {
                    Point: { pos: '44.771 43.2189' },
                  },
                },
              ],
            },
          },
        }),
      } as Response);

    const results = await provider.search({
      query: 'назрань московская',
      limit: 5,
      near: { lat: 43.0, lng: 44.0 },
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'ymapsbm1://geo?data=test',
      title: 'ул. Московская',
      lat: 43.2189,
      lng: 44.771,
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('search: без Geocoder подставляет near из запроса', async () => {
    const provider = createProvider({ geosuggest: 'test-geosuggest-key' });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: { text: 'ул. Московская' },
            uri: 'ymapsbm1://geo?data=test',
          },
        ],
      }),
    } as Response);

    const results = await provider.search({
      query: 'назрань',
      near: { lat: 43.2189, lng: 44.771 },
    });

    expect(results[0]?.lat).toBe(43.2189);
    expect(results[0]?.lng).toBe(44.771);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('search: только Geocoder ищет адреса напрямую', async () => {
    const provider = createProvider({ geocoder: 'test-geocoder-key' });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          GeoObjectCollection: {
            featureMember: [
              {
                GeoObject: {
                  name: 'ул. Московская',
                  description: 'г. Назрань',
                  Point: { pos: '44.771 43.2189' },
                  metaDataProperty: {
                    GeocoderMetaData: {
                      text: 'г. Назрань, ул. Московская',
                      Address: { formatted: 'г. Назрань, ул. Московская' },
                    },
                  },
                },
              },
            ],
          },
        },
      }),
    } as Response);

    const results = await provider.search({ query: 'назрань московская' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: 'ул. Московская',
      lat: 43.2189,
      lng: 44.771,
    });
  });

  it('search: Geosuggest не ограничивает выдачу bbox или spn', async () => {
    const provider = createProvider({ geosuggest: 'test-geosuggest-key' });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await provider.search({ query: 'пятигорск', near: { lat: 43.1687, lng: 44.8133 } });

    const url = new URL(String((global.fetch as jest.Mock).mock.calls[0]?.[0]));

    expect(url.searchParams.has('bbox')).toBe(false);
    expect(url.searchParams.has('strict_bounds')).toBe(false);
    expect(url.searchParams.has('spn')).toBe(false);
    expect(url.searchParams.get('text')).toBe('пятигорск');
    expect(url.searchParams.get('ll')).toBe('44.8133,43.1687');
  });

  it('search: Geocoder не ограничивает выдачу bbox или rspn', async () => {
    const provider = createProvider({ geocoder: 'test-geocoder-key' });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response: { GeoObjectCollection: { featureMember: [] } },
      }),
    } as Response);

    await provider.search({ query: 'тбилиси' });

    const url = new URL(String((global.fetch as jest.Mock).mock.calls[0]?.[0]));

    expect(url.searchParams.has('bbox')).toBe(false);
    expect(url.searchParams.has('rspn')).toBe(false);
    expect(url.searchParams.has('spn')).toBe(false);
    expect(url.searchParams.get('geocode')).toBe('тбилиси');
  });

  it('route делегирует RoutingProvider', async () => {
    const provider = createProvider({ geosuggest: 'key' });

    const result = await provider.route({
      origin: { lat: 43.2167, lng: 44.7667 },
      destination: { lat: 43.1687, lng: 44.8133 },
    });

    expect(result.distanceM).toBeGreaterThan(0);
    expect(result.durationS).toBeGreaterThan(0);
    expect(result.polyline.length).toBeGreaterThan(0);
  });
});
