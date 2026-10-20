import { Injectable } from '@nestjs/common';

import { encodePolyline } from './polyline.util';
import { haversineM } from './geo.util';
import {
  routePoints,
  type GeoPoint,
  type MapRouteOptions,
  type RouteResult,
} from './map-provider.interface';
import type { RoutingProvider } from './routing-provider.interface';

/** Средняя скорость в городе (м/с) для расчёта ETA в stub-провайдере. */
const AVG_SPEED_MS = 9.7; // ~35 km/h
/** Коэффициент «извилистости» дорог относительно прямой. */
const ROAD_FACTOR = 1.35;

/**
 * Локальный расчёт маршрута по прямой — fallback, когда OSRM недоступен.
 */
@Injectable()
export class StubRoutingProvider implements RoutingProvider {
  async route(options: MapRouteOptions): Promise<RouteResult> {
    const points = routePoints(options);
    // С остановками маршрут — цепочка отрезков, а не прямая между концами.
    let straightM = 0;
    for (let i = 1; i < points.length; i += 1) {
      straightM += haversineM(points[i - 1]!, points[i]!);
    }
    const distanceM = Math.round(straightM * ROAD_FACTOR);
    const durationS = Math.max(60, Math.round(distanceM / AVG_SPEED_MS));

    return {
      polyline: encodePolyline(points),
      distanceM,
      durationS,
    };
  }

  async eta(from: GeoPoint, to: GeoPoint): Promise<number> {
    const route = await this.route({ origin: from, destination: to });
    return route.durationS;
  }
}
