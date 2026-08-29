export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  polyline: string;
  distanceM: number;
  durationS: number;
}

export interface MapSearchOptions {
  query: string;
  regionId?: string;
  near?: GeoPoint;
  limit?: number;
}

export interface MapRouteOptions {
  origin: GeoPoint;
  destination: GeoPoint;
}

/**
 * Адаптер карт/маршрутов (Des §4.3, §7).
 * Конкретный провайдер выбирается по конфигурации региона.
 */
export interface MapProvider {
  search(options: MapSearchOptions): Promise<AddressSuggestion[]>;
  /** Адрес по координатам. `null` — провайдер не нашёл улицу или геокодер недоступен. */
  reverseGeocode(point: GeoPoint): Promise<string | null>;
  route(options: MapRouteOptions): Promise<RouteResult>;
  eta(from: GeoPoint, to: GeoPoint): Promise<number>;
  /**
   * Адрес по координатам. `null` — провайдер не нашёл ничего или недоступен.
   *
   * Нужен, когда клиент подставил точку подачи по GPS и адреса не знает: показывать
   * водителю «Моё местоположение» или голые координаты нельзя, ему ехать к дому.
   */
  reverse(point: GeoPoint): Promise<string | null>;
}

export const MAP_PROVIDER = Symbol('MAP_PROVIDER');
