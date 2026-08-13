import { Inject, Injectable } from '@nestjs/common';
import { normalizeAddressQuery, scoreMatch, tokenizeQuery } from '../address/address-normalizer';
import type {
  AddressSuggestion,
  GeoPoint,
  MapProvider,
  MapRouteOptions,
  MapSearchOptions,
  RouteResult,
} from './map-provider.interface';
import { ROUTING_PROVIDER, type RoutingProvider } from './routing-provider.interface';
import { haversineM } from './geo.util';

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

/**
 * Stub MapProvider с локальной базой адресов Ингушетии (Des §4.3).
 * Поиск адресов — локальный; маршрут делегируется RoutingProvider (OSRM или stub).
 */
@Injectable()
export class StubMapProvider implements MapProvider {
  constructor(@Inject(ROUTING_PROVIDER) private readonly routing: RoutingProvider) {}

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

  route(options: MapRouteOptions): Promise<RouteResult> {
    return this.routing.route(options);
  }

  eta(from: GeoPoint, to: GeoPoint): Promise<number> {
    return this.routing.eta(from, to);
  }

  /**
   * Ближайшая точка из локального справочника. Дальше километра не отвечаем: подставить
   * «Назрань, центр» водителю, который едет в соседнее село, хуже, чем не подставить ничего.
   */
  reverse(point: GeoPoint): Promise<string | null> {
    let nearest: { address: string; distance: number } | null = null;

    for (const poi of this.pois) {
      const distance = haversineM(point, { lat: poi.lat, lng: poi.lng });
      if (!nearest || distance < nearest.distance) {
        nearest = { address: poi.address, distance };
      }
    }

    return Promise.resolve(nearest && nearest.distance <= 1000 ? nearest.address : null);
  }
}
