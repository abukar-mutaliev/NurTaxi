import { Injectable } from '@nestjs/common';
import { normalizeAddressQuery, scoreMatch, tokenizeQuery } from '../address/address-normalizer';
import type {
  AddressSuggestion,
  GeoPoint,
  MapProvider,
  MapRouteOptions,
  MapSearchOptions,
  RouteResult,
} from './map-provider.interface';

interface LocalPoi {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
  regionId: string;
  searchText: string;
}

/** Средняя скорость в городе (м/с) для расчёта ETA в stub-провайдере. */
const AVG_SPEED_MS = 9.7; // ~35 km/h
/** Коэффициент «извилистости» дорог относительно прямой. */
const ROAD_FACTOR = 1.35;

/**
 * Stub MapProvider с локальной базой адресов Ингушетии (Des §4.3).
 * Заменяется реальным провайдером (Yandex/2GIS) через конфигурацию региона.
 */
@Injectable()
export class StubMapProvider implements MapProvider {
  private readonly pois: LocalPoi[] = [
    {
      id: 'poi-nazran-center',
      title: 'Назрань, центр',
      subtitle: 'Республика Ингушетия',
      address: 'г. Назрань, центральная часть',
      lat: 43.2167,
      lng: 44.7667,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'назрань центр город',
    },
    {
      id: 'poi-nazran-moscowskaya',
      title: 'ул. Московская',
      subtitle: 'г. Назрань',
      address: 'г. Назрань, ул. Московская',
      lat: 43.2189,
      lng: 44.771,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'назрань ул московская улица',
    },
    {
      id: 'poi-nazran-railway',
      title: 'Ж/д вокзал Назрань',
      subtitle: 'г. Назрань',
      address: 'г. Назрань, железнодорожный вокзал',
      lat: 43.2125,
      lng: 44.759,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'назрань вокзал жд железнодорожный',
    },
    {
      id: 'poi-magas-center',
      title: 'Магас, центр',
      subtitle: 'Республика Ингушетия',
      address: 'г. Магас, центральная часть',
      lat: 43.1667,
      lng: 44.8,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'магас центр город столица',
    },
    {
      id: 'poi-magas-admin',
      title: 'Администрация Республики Ингушетия',
      subtitle: 'г. Магас',
      address: 'г. Магас, административный комплекс',
      lat: 43.168,
      lng: 44.802,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'магас администрация правительство',
    },
    {
      id: 'poi-sunzha-center',
      title: 'Сунжа, центр',
      subtitle: 'Республика Ингушетия',
      address: 'п. Сунжа, центральная часть',
      lat: 43.3167,
      lng: 44.8333,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'сунжа центр',
    },
    {
      id: 'poi-karabulak-center',
      title: 'Карабулак, центр',
      subtitle: 'Республика Ингушетия',
      address: 'г. Карабулак, центральная часть',
      lat: 43.3056,
      lng: 44.9083,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'карабулак центр',
    },
    {
      id: 'poi-malgobek-center',
      title: 'Малгобек, центр',
      subtitle: 'Республика Ингушетия',
      address: 'г. Малгобек, центральная часть',
      lat: 43.5083,
      lng: 44.5833,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'малгобек центр',
    },
    {
      id: 'poi-nazran-market',
      title: 'Рынок Назрань',
      subtitle: 'г. Назрань',
      address: 'г. Назрань, центральный рынок',
      lat: 43.214,
      lng: 44.768,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'назрань рынок базар',
    },
    {
      id: 'poi-nazran-hospital',
      title: 'Городская больница',
      subtitle: 'г. Назрань',
      address: 'г. Назрань, городская больница',
      lat: 43.22,
      lng: 44.763,
      regionId: '00000000-0000-4000-8000-000000000001',
      searchText: 'назрань больница поликлиника',
    },
  ];

  async search(options: MapSearchOptions): Promise<AddressSuggestion[]> {
    const normalized = normalizeAddressQuery(options.query);
    if (!normalized) return [];

    const tokens = tokenizeQuery(normalized);
    const limit = options.limit ?? 10;

    const scored = this.pois
      .filter((poi) => !options.regionId || poi.regionId === options.regionId)
      .map((poi) => ({
        poi,
        score: scoreMatch(normalized, tokens, poi.searchText + ' ' + poi.address),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ poi }) => ({
      id: poi.id,
      title: poi.title,
      subtitle: poi.subtitle,
      address: poi.address,
      lat: poi.lat,
      lng: poi.lng,
    }));
  }

  async route(options: MapRouteOptions): Promise<RouteResult> {
    const straightM = haversineM(options.origin, options.destination);
    const distanceM = Math.round(straightM * ROAD_FACTOR);
    const durationS = Math.max(60, Math.round(distanceM / AVG_SPEED_MS));

    return {
      polyline: encodePolyline([options.origin, options.destination]),
      distanceM,
      durationS,
    };
  }

  async eta(from: GeoPoint, to: GeoPoint): Promise<number> {
    const route = await this.route({ origin: from, destination: to });
    return route.durationS;
  }
}

/** Haversine-расстояние в метрах. */
export function haversineM(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Упрощённая polyline (origin → destination) для MVP. */
function encodePolyline(points: GeoPoint[]): string {
  return points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
}
