import { ConfigService } from '@nestjs/config';

import { StubRoutingProvider } from './stub-routing.provider';
import { YandexMapProvider } from './yandex-map.provider';

describe('YandexMapProvider.reverseGeocode', () => {
  const routingProvider = new StubRoutingProvider();

  function createProvider() {
    const config = {
      get: () => ({
        provider: 'yandex',
        yandexGeosuggestApiKey: '',
        yandexGeocoderApiKey: 'test-geocoder-key',
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

  it('возвращает короткий адрес дома по координатам', async () => {
    const provider = createProvider();

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          GeoObjectCollection: {
            featureMember: [
              {
                GeoObject: {
                  name: 'улица Московская, 12',
                  description: 'Назрань, Республика Ингушетия, Россия',
                  Point: { pos: '44.771 43.2189' },
                  metaDataProperty: {
                    GeocoderMetaData: {
                      text: 'Россия, Республика Ингушетия, г. Назрань, ул. Московская, 12',
                      Address: {
                        formatted: 'Россия, Республика Ингушетия, г. Назрань, ул. Московская, 12',
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      }),
    } as Response);

    await expect(provider.reverseGeocode({ lat: 43.2189, lng: 44.771 })).resolves.toBe(
      'г. Назрань, ул. Московская, 12',
    );

    const url = String((global.fetch as jest.Mock).mock.calls[0]?.[0]);
    expect(url).toContain('geocode=44.771%2C43.2189');
    expect(url).toContain('kind=house');
  });

  it('без ключа Geocoder возвращает null', async () => {
    const config = {
      get: () => ({
        provider: 'yandex',
        yandexGeosuggestApiKey: 'suggest-key',
        yandexGeocoderApiKey: '',
        geosuggestUrl: 'https://suggest-maps.yandex.ru/v1/suggest',
        geocoderUrl: 'https://geocode-maps.yandex.ru/v1/',
        locale: 'ru_RU',
        requestTimeoutMs: 5000,
      }),
    } as unknown as ConfigService;

    const provider = new YandexMapProvider(config, routingProvider);
    await expect(provider.reverseGeocode({ lat: 43.2189, lng: 44.771 })).resolves.toBeNull();
  });
});
