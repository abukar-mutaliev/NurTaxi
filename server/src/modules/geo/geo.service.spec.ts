import { CircuitBreakerService } from '../../common/resilience/circuit-breaker.service';
import { MetricsService } from '../../observability/metrics/metrics.service';
import { GeoCacheService } from './geo-cache.service';
import { GeoService } from './geo.service';
import type { MapProvider, RouteResult } from './map/map-provider.interface';

describe('GeoService', () => {
  const routeResult: RouteResult = {
    polyline: 'encoded',
    distanceM: 2400,
    durationS: 420,
  };

  function createService(overrides?: { cached?: RouteResult | null; route?: jest.Mock }) {
    const mapProvider: Pick<MapProvider, 'search' | 'route' | 'eta' | 'reverseGeocode'> = {
      search: jest.fn(),
      route: overrides?.route ?? jest.fn().mockResolvedValue(routeResult),
      eta: jest.fn(),
      reverseGeocode: jest.fn().mockResolvedValue('г. Назрань, ул. Московская, 12'),
    };
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getRoute: jest.fn().mockResolvedValue(overrides?.cached ?? null),
      setRoute: jest.fn().mockResolvedValue(undefined),
      getReverse: jest.fn().mockResolvedValue(null),
      setReverse: jest.fn().mockResolvedValue(undefined),
    };
    const metrics = { observeExternalCall: jest.fn() };

    const service = new GeoService(
      mapProvider as MapProvider,
      cache as unknown as GeoCacheService,
      new CircuitBreakerService(),
      metrics as unknown as MetricsService,
    );

    return { service, mapProvider, cache };
  }

  it('строит маршрут через MapProvider и кладёт его в кэш', async () => {
    const { service, mapProvider, cache } = createService();

    await expect(
      service.route({
        originLat: 43.2167,
        originLng: 44.7667,
        destLat: 43.1687,
        destLng: 44.8133,
      }),
    ).resolves.toEqual(routeResult);

    expect(mapProvider.route).toHaveBeenCalledWith({
      origin: { lat: 43.2167, lng: 44.7667 },
      destination: { lat: 43.1687, lng: 44.8133 },
    });
    expect(cache.setRoute).toHaveBeenCalledWith(43.2167, 44.7667, 43.1687, 44.8133, routeResult);
  });

  it('не ходит во внешний провайдер, если маршрут уже в кэше', async () => {
    const { service, mapProvider } = createService({ cached: routeResult });

    await expect(
      service.route({
        originLat: 43.2167,
        originLng: 44.7667,
        destLat: 43.1687,
        destLng: 44.8133,
      }),
    ).resolves.toEqual(routeResult);

    expect(mapProvider.route).not.toHaveBeenCalled();
  });

  it('при сбое маршрутизации деградирует в null', async () => {
    const { service } = createService({
      route: jest.fn().mockRejectedValue(new Error('OSRM down')),
    });

    await expect(
      service.route({
        originLat: 43.2167,
        originLng: 44.7667,
        destLat: 43.1687,
        destLng: 44.8133,
      }),
    ).resolves.toBeNull();
  });

  it('resolveStoredAddress заменяет «Моё местоположение» улицей', async () => {
    const { service, mapProvider, cache } = createService();

    await expect(
      service.resolveStoredAddress({
        lat: 43.2189,
        lng: 44.771,
        address: 'Моё местоположение',
      }),
    ).resolves.toBe('г. Назрань, ул. Московская, 12');

    expect(mapProvider.reverseGeocode).toHaveBeenCalledWith({ lat: 43.2189, lng: 44.771 });
    expect(cache.setReverse).toHaveBeenCalledWith(
      43.2189,
      44.771,
      'г. Назрань, ул. Московская, 12',
    );
  });

  it('resolveStoredAddress оставляет выбранный вручную адрес', async () => {
    const { service, mapProvider } = createService();

    await expect(
      service.resolveStoredAddress({
        lat: 43.1667,
        lng: 44.8,
        address: 'г. Магас, ул. Ленина, 3',
      }),
    ).resolves.toBe('г. Магас, ул. Ленина, 3');

    expect(mapProvider.reverseGeocode).not.toHaveBeenCalled();
  });
});
