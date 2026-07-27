import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RoutingConfig } from '../../../config/configuration';
import type { GeoPoint, MapRouteOptions, RouteResult } from './map-provider.interface';
import type { RoutingProvider } from './routing-provider.interface';
import { StubRoutingProvider } from './stub-routing.provider';

interface OsrmRouteResponse {
  code?: string;
  message?: string;
  /** Не-OSRM ответы (Yandex/2GIS и т.п.) — признак неверного URL. */
  status?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: string;
  }>;
}

/**
 * Маршрутизация через OSRM (Open Source Routing Machine).
 * Поиск адресов остаётся у Yandex/Stub — здесь только расчёт дорожного маршрута A→B.
 */
@Injectable()
export class OsrmRoutingProvider implements RoutingProvider, OnModuleInit {
  private readonly logger = new Logger(OsrmRoutingProvider.name);
  private readonly config: RoutingConfig;

  constructor(
    configService: ConfigService,
    private readonly stubRouting: StubRoutingProvider,
  ) {
    this.config = configService.get<RoutingConfig>('routing')!;
  }

  onModuleInit(): void {
    this.logger.log(
      `Routing via OSRM (${this.config.osrmBaseUrl}), fallbackToStub=${this.config.fallbackToStub}`,
    );
  }

  async route(options: MapRouteOptions): Promise<RouteResult> {
    try {
      return await this.routeViaOsrm(options);
    } catch (cause) {
      if (this.config.fallbackToStub) {
        this.logger.warn(
          `OSRM route failed, falling back to stub: ${
            cause instanceof Error ? cause.message : String(cause)
          }`,
        );
        return this.stubRouting.route(options);
      }
      throw cause;
    }
  }

  async eta(from: GeoPoint, to: GeoPoint): Promise<number> {
    const route = await this.route({ origin: from, destination: to });
    return route.durationS;
  }

  private async routeViaOsrm(options: MapRouteOptions): Promise<RouteResult> {
    const baseUrl = this.config.osrmBaseUrl.replace(/\/$/, '');
    const { origin, destination } = options;

    // OSRM принимает координаты в порядке longitude,latitude.
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const params = new URLSearchParams({
      overview: 'full',
      geometries: 'polyline',
      steps: 'false',
    });

    const url = `${baseUrl}/route/v1/driving/${coordinates}?${params.toString()}`;
    const payload = await this.fetchJson<OsrmRouteResponse>(url, baseUrl);

    if (payload.status === 'error') {
      throw new Error(
        `На ${baseUrl} отвечает не OSRM (${payload.message ?? 'unknown'}). Проверьте OSRM_BASE_URL — порт 5000 часто занят другим сервисом, используйте 5001 или https://router.project-osrm.org`,
      );
    }

    if (payload.code !== 'Ok' || !payload.routes?.length) {
      throw new Error(payload.message ?? `OSRM returned code ${payload.code ?? 'unknown'}`);
    }

    const bestRoute = payload.routes[0]!;
    const distanceM = Math.round(bestRoute.distance ?? 0);
    const durationS = Math.max(60, Math.round(bestRoute.duration ?? 0));
    const polyline = bestRoute.geometry?.trim();

    if (!polyline || distanceM <= 0) {
      throw new Error('OSRM returned an empty route geometry');
    }

    return { polyline, distanceM, durationS };
  }

  private async fetchJson<T>(url: string, baseUrl: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    if (!response.ok) {
      const body =
        typeof response.text === 'function'
          ? await response.text()
          : JSON.stringify(await response.json());
      throw new Error(
        `OSRM HTTP ${response.status} at ${baseUrl}: ${body.slice(0, 200)}. Если это не OSRM — проверьте OSRM_BASE_URL`,
      );
    }

    return (await response.json()) as T;
  }
}
