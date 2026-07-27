import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MapsConfig } from '../../../config/configuration';
import type {
  AddressSuggestion,
  GeoPoint,
  MapProvider,
  MapRouteOptions,
  MapSearchOptions,
} from './map-provider.interface';
import { ROUTING_PROVIDER, type RoutingProvider } from './routing-provider.interface';

/** Bbox Республики Ингушетия (lon,lat) для ограничения поиска в пилотном регионе. */
const INGUSHETIA_BBOX = '44.0,42.8~45.6,43.7';

/** Запасные координаты, если клиент не передал `near` (центр Магаса). */
const DEFAULT_NEAR: GeoPoint = { lat: 43.1687, lng: 44.8133 };

interface YandexGeosuggestResponse {
  results?: Array<{
    title?: { text?: string };
    subtitle?: { text?: string };
    address?: { formatted_address?: string };
    uri?: string;
  }>;
}

interface YandexGeocoderResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{ GeoObject?: YandexGeoObject }>;
    };
  };
}

interface YandexGeoObject {
  name?: string;
  description?: string;
  uri?: string;
  Point?: { pos?: string };
  metaDataProperty?: {
    GeocoderMetaData?: {
      text?: string;
      Address?: { formatted?: string };
    };
  };
}

/**
 * MapProvider: Geosuggest (подсказки) + Geocoder (координаты), маршрут — через RoutingProvider (OSRM).
 * Des §4.3 · Фаза 3 (Req §8.9, §8.10).
 */
@Injectable()
export class YandexMapProvider implements MapProvider {
  private readonly logger = new Logger(YandexMapProvider.name);
  private readonly config: MapsConfig;

  constructor(
    configService: ConfigService,
    @Inject(ROUTING_PROVIDER) private readonly routing: RoutingProvider,
  ) {
    this.config = configService.get<MapsConfig>('maps')!;
  }

  async search(options: MapSearchOptions): Promise<AddressSuggestion[]> {
    if (this.config.yandexGeosuggestApiKey) {
      return this.searchViaGeosuggest(options);
    }

    if (this.config.yandexGeocoderApiKey) {
      return this.searchViaGeocoder(options);
    }

    throw new Error('Yandex map provider: no Geosuggest or Geocoder API key configured');
  }

  route(options: MapRouteOptions) {
    return this.routing.route(options);
  }

  eta(from: GeoPoint, to: GeoPoint) {
    return this.routing.eta(from, to);
  }

  private async searchViaGeosuggest(options: MapSearchOptions): Promise<AddressSuggestion[]> {
    const limit = options.limit ?? 10;
    const near = options.near ?? DEFAULT_NEAR;

    const params = new URLSearchParams({
      apikey: this.config.yandexGeosuggestApiKey,
      text: options.query,
      lang: this.config.locale,
      results: String(limit),
      print_address: '1',
      attrs: 'uri',
      bbox: this.config.searchBbox ?? INGUSHETIA_BBOX,
      strict_bounds: '1',
      ll: `${near.lng},${near.lat}`,
      spn: '0.4,0.4',
    });

    const url = `${this.config.geosuggestUrl}?${params.toString()}`;
    const data = await this.fetchJson<YandexGeosuggestResponse>(url, 'geosuggest');

    const items = (data.results ?? []).filter((item) => item.title?.text?.trim());

    return Promise.all(
      items.map(async (item, index) => {
        const title = item.title!.text!.trim();
        const subtitle = item.subtitle?.text?.trim() ?? '';
        const address = item.address?.formatted_address?.trim() ?? title;
        const id = item.uri ?? `yandex-suggest-${index}-${title}`;

        let coords = near;
        if (this.config.yandexGeocoderApiKey && item.uri) {
          coords = (await this.geocodeByUri(item.uri)) ?? near;
        }

        return { id, title, subtitle, address, lat: coords.lat, lng: coords.lng };
      }),
    );
  }

  /** Прямой поиск через Geocoder, если ключ Geosuggest не задан. */
  private async searchViaGeocoder(options: MapSearchOptions): Promise<AddressSuggestion[]> {
    const limit = options.limit ?? 10;
    const near = options.near ?? DEFAULT_NEAR;

    const params = new URLSearchParams({
      apikey: this.config.yandexGeocoderApiKey,
      geocode: options.query,
      format: 'json',
      lang: this.config.locale,
      results: String(limit),
      bbox: this.config.searchBbox ?? INGUSHETIA_BBOX,
      rspn: '1',
      ll: `${near.lng},${near.lat}`,
      spn: '0.3,0.3',
    });

    const url = `${this.config.geocoderUrl}?${params.toString()}`;
    const data = await this.fetchJson<YandexGeocoderResponse>(url, 'geocoder');

    return (data.response?.GeoObjectCollection?.featureMember ?? [])
      .map((member, index) => this.geoObjectToSuggestion(member.GeoObject, index))
      .filter((item): item is AddressSuggestion => item !== null);
  }

  private async geocodeByUri(uri: string): Promise<GeoPoint | null> {
    const params = new URLSearchParams({
      apikey: this.config.yandexGeocoderApiKey,
      uri,
      format: 'json',
      lang: this.config.locale,
      results: '1',
    });

    try {
      const url = `${this.config.geocoderUrl}?${params.toString()}`;
      const data = await this.fetchJson<YandexGeocoderResponse>(url, 'geocoder');
      const geoObject = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
      return this.parsePoint(geoObject?.Point?.pos);
    } catch (error) {
      this.logger.warn(
        `Geocoder uri lookup failed: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private geoObjectToSuggestion(
    geoObject: YandexGeoObject | undefined,
    index: number,
  ): AddressSuggestion | null {
    const coords = this.parsePoint(geoObject?.Point?.pos);
    if (!coords) {
      return null;
    }

    const meta = geoObject?.metaDataProperty?.GeocoderMetaData;
    const address = meta?.Address?.formatted ?? meta?.text ?? geoObject?.name ?? '';
    const title = geoObject?.name ?? address;
    const subtitle = geoObject?.description ?? '';

    return {
      id: geoObject?.uri ?? `yandex-geocode-${index}`,
      title,
      subtitle,
      address,
      lat: coords.lat,
      lng: coords.lng,
    };
  }

  /** Yandex Geocoder: pos = «longitude latitude». */
  private parsePoint(pos?: string): GeoPoint | null {
    if (!pos) {
      return null;
    }

    const [lng, lat] = pos.split(/\s+/).map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }

  private async fetchJson<T>(url: string, operation: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`Yandex ${operation} HTTP ${response.status}: ${body.slice(0, 200)}`);
      throw new Error(`Yandex ${operation} failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
