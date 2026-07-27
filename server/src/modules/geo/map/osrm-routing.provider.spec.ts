import { ConfigService } from '@nestjs/config';
import { StubRoutingProvider } from './stub-routing.provider';
import { OsrmRoutingProvider } from './osrm-routing.provider';

describe('OsrmRoutingProvider', () => {
  const stubRouting = new StubRoutingProvider();

  function createProvider(config: {
    osrmBaseUrl?: string;
    fallbackToStub?: boolean;
    requestTimeoutMs?: number;
  }) {
    const configService = {
      get: () => ({
        provider: 'osrm',
        osrmBaseUrl: config.osrmBaseUrl ?? 'http://localhost:5000',
        requestTimeoutMs: config.requestTimeoutMs ?? 5000,
        fallbackToStub: config.fallbackToStub ?? false,
      }),
    } as unknown as ConfigService;

    return new OsrmRoutingProvider(configService, stubRouting);
  }

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('возвращает polyline, дистанцию и длительность из OSRM', async () => {
    const provider = createProvider({});

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [
          {
            distance: 12500,
            duration: 900,
            geometry: 'encoded_polyline_test',
          },
        ],
      }),
    } as Response);

    const result = await provider.route({
      origin: { lat: 43.2167, lng: 44.7667 },
      destination: { lat: 43.1687, lng: 44.8133 },
    });

    expect(result).toEqual({
      polyline: 'encoded_polyline_test',
      distanceM: 12500,
      durationS: 900,
    });

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/route/v1/driving/');
    expect(calledUrl).toContain('44.7667,43.2167');
    expect(calledUrl).toContain('44.8133,43.1687');
    expect(calledUrl).toContain('geometries=polyline');
  });

  it('при ошибке OSRM падает, если fallback отключён', async () => {
    const provider = createProvider({ fallbackToStub: false });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'NoRoute',
        message: 'No route found',
      }),
    } as Response);

    await expect(
      provider.route({
        origin: { lat: 43.2167, lng: 44.7667 },
        destination: { lat: 43.1687, lng: 44.8133 },
      }),
    ).rejects.toThrow('No route found');
  });

  it('при ошибке OSRM возвращает stub-маршрут, если fallback включён', async () => {
    const provider = createProvider({ fallbackToStub: true });

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await provider.route({
      origin: { lat: 43.2167, lng: 44.7667 },
      destination: { lat: 43.1687, lng: 44.8133 },
    });

    expect(result.distanceM).toBeGreaterThan(0);
    expect(result.durationS).toBeGreaterThan(0);
    expect(result.polyline.length).toBeGreaterThan(0);
  });
});
