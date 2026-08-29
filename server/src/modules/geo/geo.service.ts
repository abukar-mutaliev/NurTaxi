import { Injectable, Inject, Logger } from '@nestjs/common';
import { GeoCacheService } from './geo-cache.service';
import {
  MAP_PROVIDER,
  type AddressSuggestion,
  type GeoPoint,
  type MapProvider,
  type RouteResult,
} from './map/map-provider.interface';
import { isPlaceholderAddress } from './address/is-placeholder-address';
import { normalizeAddressQuery } from './address/address-normalizer';
import { CircuitBreakerService } from '../../common/resilience/circuit-breaker.service';
import { resilientCall } from '../../common/resilience/resilient-call';
import { MetricsService } from '../../observability/metrics/metrics.service';

export interface GeoSearchParams {
  query: string;
  regionId?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

export interface GeoRouteParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(
    @Inject(MAP_PROVIDER) private readonly mapProvider: MapProvider,
    private readonly cache: GeoCacheService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly metrics: MetricsService,
  ) {}

  async search(params: GeoSearchParams): Promise<AddressSuggestion[]> {
    const normalized = normalizeAddressQuery(params.query);
    if (!normalized) return [];

    const cached = await this.cache.get<AddressSuggestion[]>(normalized, params.regionId);
    if (cached) return cached;

    try {
      const results = await resilientCall(
        () =>
          this.mapProvider.search({
            query: normalized,
            regionId: params.regionId,
            near:
              params.lat !== undefined && params.lng !== undefined
                ? { lat: params.lat, lng: params.lng }
                : undefined,
            limit: params.limit ?? 10,
          }),
        {
          timeoutMs: 5000,
          retries: 1,
          circuitKey: 'map',
          circuitBreaker: this.circuitBreaker,
          onAttempt: (durationMs, success) =>
            this.metrics.observeExternalCall('map', 'search', durationMs, success),
        },
      );

      await this.cache.set(normalized, params.regionId, results);
      return results;
    } catch (error) {
      // Graceful degradation: поиск адресов некритичен для создания заказа (Des §11).
      this.logger.warn(`Map search degraded: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * Дорожный маршрут A→B для навигатора. Поиск адресов идёт через MapProvider,
   * геометрия пути — через RoutingProvider (OSRM), который MapProvider.route уже делегирует.
   */
  async route(params: GeoRouteParams): Promise<RouteResult | null> {
    const origin = { lat: params.originLat, lng: params.originLng };
    const destination = { lat: params.destLat, lng: params.destLng };

    const cached = await this.cache.getRoute<RouteResult>(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng,
    );
    if (cached) return cached;

    try {
      const result = await resilientCall(() => this.mapProvider.route({ origin, destination }), {
        timeoutMs: 5000,
        retries: 1,
        circuitKey: 'routing',
        circuitBreaker: this.circuitBreaker,
        onAttempt: (durationMs, success) =>
          this.metrics.observeExternalCall('routing', 'route', durationMs, success),
      });

      await this.cache.setRoute(origin.lat, origin.lng, destination.lat, destination.lng, result);
      return result;
    } catch (error) {
      this.logger.warn(`Map route degraded: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async reverseGeocode(point: GeoPoint): Promise<string | null> {
    const cached = await this.cache.getReverse(point.lat, point.lng);
    if (cached) return cached;

    try {
      const address = await resilientCall(() => this.mapProvider.reverseGeocode(point), {
        timeoutMs: 5000,
        retries: 1,
        circuitKey: 'map',
        circuitBreaker: this.circuitBreaker,
        onAttempt: (durationMs, success) =>
          this.metrics.observeExternalCall('map', 'reverse', durationMs, success),
      });

      if (address?.trim()) {
        const resolved = address.trim();
        await this.cache.setReverse(point.lat, point.lng, resolved);
        return resolved;
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `Reverse geocode degraded: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Адрес для заказа и журнала: подпись GPS / координаты заменяем улицей по точке.
   * Если геокодер недоступен, оставляем координаты — это всё ещё лучше, чем «Моё местоположение».
   */
  async resolveStoredAddress(location: GeoPoint & { address?: string }): Promise<string> {
    const fallback = `${location.lat}, ${location.lng}`;
    if (!isPlaceholderAddress(location.address)) {
      return location.address!.trim();
    }

    return (await this.reverseGeocode({ lat: location.lat, lng: location.lng })) ?? fallback;
  }
}
