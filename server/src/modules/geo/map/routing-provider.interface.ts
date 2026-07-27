import type { GeoPoint, MapRouteOptions, RouteResult } from './map-provider.interface';

/**
 * Адаптер маршрутизации (Des §4.3, §7).
 * Отделён от MapProvider: поиск адресов и построение маршрута могут использовать разных поставщиков.
 */
export interface RoutingProvider {
  route(options: MapRouteOptions): Promise<RouteResult>;
  eta(from: GeoPoint, to: GeoPoint): Promise<number>;
}

export const ROUTING_PROVIDER = Symbol('ROUTING_PROVIDER');
