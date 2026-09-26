import { ConfigService } from '@nestjs/config';

import { StubRoutingProvider } from './stub-routing.provider';
import { DEFAULT_SEARCH_BBOX, YandexMapProvider } from './yandex-map.provider';

const RUSSIA_CITIES: Array<{ name: string; lng: number; lat: number }> = [
  { name: 'Калининград', lng: 20.5104, lat: 54.7104 },
  { name: 'Москва', lng: 37.6173, lat: 55.7558 },
  { name: 'Нальчик (КБР)', lng: 43.6189, lat: 43.4981 },
  { name: 'Черкесск (КЧР)', lng: 42.0578, lat: 44.2233 },
  { name: 'Махачкала (Дагестан)', lng: 47.5047, lat: 42.9849 },
  { name: 'Новосибирск', lng: 82.9346, lat: 55.0084 },
  { name: 'Владивосток', lng: 131.8855, lat: 43.1155 },
];

function bboxContains(bbox: string, lng: number, lat: number): boolean {
  const [southWest, northEast] = bbox.split('~');
  const [lng1, lat1] = southWest.split(',').map(Number);
  const [lng2, lat2] = northEast.split(',').map(Number);
  return lng >= lng1 && lng <= lng2 && lat >= lat1 && lat <= lat2;
}

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

  it('search: Geosuggest bbox покрывает всю Россию', async () => {
    const provider = createProvider({ geosuggest: 'test-geosuggest-key' });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await provider.search({ query: 'москва', near: { lat: 43.1687, lng: 44.8133 } });

    const url = new URL(String((global.fetch as jest.Mock).mock.calls[0]?.[0]));
    const bbox = url.searchParams.get('bbox');

    expect(bbox).toBe(DEFAULT_SEARCH_BBOX);
    expect(url.searchParams.get('strict_bounds')).toBe('1');
    for (const city of RUSSIA_CITIES) {
      expect(bboxContains(bbox!, city.lng, city.lat)).toBe(true);
    }
  });

  it('search: Geocoder bbox покрывает всю Россию без узкого spn', async () => {
    const provider = createProvider({ geocoder: 'test-geocoder-key' });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response: { GeoObjectCollection: { featureMember: [] } },
      }),
    } as Response);

    await provider.search({ query: 'владивосток' });

    const url = new URL(String((global.fetch as jest.Mock).mock.calls[0]?.[0]));
    const bbox = url.searchParams.get('bbox');

    expect(bbox).toBe(DEFAULT_SEARCH_BBOX);
    expect(url.searchParams.get('rspn')).toBe('1');
    expect(url.searchParams.has('spn')).toBe(false);
    for (const city of RUSSIA_CITIES) {
      expect(bboxContains(bbox!, city.lng, city.lat)).toBe(true);
    }
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
