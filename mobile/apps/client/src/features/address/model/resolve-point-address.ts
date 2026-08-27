/**
 * Улица по координатам для GPS-подачи. `/geo/reverse` есть только на обновлённом
 * бэкенде — пока его нет (404), идём в поиск рядом и в Nominatim, но никогда
 * не возвращаем «Моё местоположение».
 */
import {
  formatShortDisplayAddress,
  haversineDistance,
  isPlaceholderAddress,
} from '@nurtaxi/shared-core/shared/lib';
import type {
  AddressSuggestion,
  GeoLocation,
  GeoPoint,
  GeoSearchQuery,
} from '@nurtaxi/shared-core/shared/model';

const MAX_NEARBY_M = 150;
const SAME_POINT_EPS = 1e-4;

export interface ResolvePointAddressDeps {
  reverseViaApi: (point: GeoPoint) => Promise<string | null>;
  search: (query: GeoSearchQuery) => Promise<AddressSuggestion[]>;
  fetchImpl?: typeof fetch;
  cache?: Map<string, Promise<string | null>>;
}

const defaultCache = new Map<string, Promise<string | null>>();

function pointKey(point: GeoPoint): string {
  return `${Number(point.lat).toFixed(4)},${Number(point.lng).toFixed(4)}`;
}

function usableAddress(
  value: string | null | undefined,
  extraLabels: readonly string[],
): string | null {
  const raw = value?.trim();
  if (!raw || isPlaceholderAddress(raw, extraLabels)) {
    return null;
  }

  const short = formatShortDisplayAddress(raw) || raw;
  return isPlaceholderAddress(short, extraLabels) ? null : short;
}

function suggestionDistance(item: AddressSuggestion, point: GeoPoint): number | null {
  if (
    Math.abs(item.lat - point.lat) < SAME_POINT_EPS &&
    Math.abs(item.lng - point.lng) < SAME_POINT_EPS
  ) {
    return null;
  }

  return haversineDistance(point, item);
}

function pickNearbyAddress(
  results: AddressSuggestion[],
  point: GeoPoint,
  extraLabels: readonly string[],
): string | null {
  let best: { address: string; distance: number } | null = null;

  for (const item of results) {
    const address = usableAddress(item.address || item.title, extraLabels);
    if (!address) {
      continue;
    }

    const distance = suggestionDistance(item, point);
    if (distance == null || distance > MAX_NEARBY_M) {
      continue;
    }

    if (!best || distance < best.distance) {
      best = { address, distance };
    }
  }

  return best?.address ?? null;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  residential?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
}

interface NominatimReverse {
  display_name?: string;
  address?: NominatimAddress;
}

function formatNominatimAddress(
  data: NominatimReverse,
  extraLabels: readonly string[],
): string | null {
  const parts = data.address ?? {};
  const locality = parts.city || parts.town || parts.village || parts.municipality;
  const road = parts.road || parts.pedestrian || parts.residential;
  if (road) {
    return usableAddress(
      [locality, road, parts.house_number].filter(Boolean).join(', '),
      extraLabels,
    );
  }

  return usableAddress(data.display_name, extraLabels);
}

async function reverseViaNominatim(
  point: GeoPoint,
  extraLabels: readonly string[],
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lng),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'ru',
  });

  const response = await Promise.race([
    fetchImpl(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NurTaxi/1.0 (client reverse-geocode fallback)',
      },
    }),
    new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('nominatim-timeout')), 4000);
    }),
  ]);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimReverse;
  return formatNominatimAddress(data, extraLabels);
}

async function reverseViaSearch(
  point: GeoPoint,
  extraLabels: readonly string[],
  search: ResolvePointAddressDeps['search'],
  regionId?: string,
): Promise<string | null> {
  const queries = [`${point.lng.toFixed(6)},${point.lat.toFixed(6)}`, 'улица'];

  for (const q of queries) {
    const results = await search({
      q,
      lat: point.lat,
      lng: point.lng,
      limit: 5,
      ...(regionId ? { regionId } : {}),
    });
    const nearby = pickNearbyAddress(results, point, extraLabels);
    if (nearby) {
      return nearby;
    }
  }

  return null;
}

async function resolvePointAddressUncached(
  location: GeoLocation,
  extraLabels: readonly string[],
  deps: ResolvePointAddressDeps,
  regionId?: string,
): Promise<string | null> {
  const point = {
    lat: Number(location.lat.toFixed(4)),
    lng: Number(location.lng.toFixed(4)),
  };

  const fromApi = usableAddress(await deps.reverseViaApi(point), extraLabels);
  if (fromApi) {
    return fromApi;
  }

  try {
    const fromNominatim = await reverseViaNominatim(point, extraLabels, deps.fetchImpl ?? fetch);
    if (fromNominatim) {
      return fromNominatim;
    }
  } catch {
    // Nominatim недоступен — пробуем ближайшую улицу из обычного поиска.
  }

  try {
    return await reverseViaSearch(point, extraLabels, deps.search, regionId);
  } catch {
    return null;
  }
}

export function resolvePointAddress(
  location: GeoLocation,
  extraLabels: readonly string[],
  deps: ResolvePointAddressDeps,
  regionId?: string,
): Promise<string | null> {
  const cache = deps.cache ?? defaultCache;
  const key = pointKey(location);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const pending = resolvePointAddressUncached(location, extraLabels, deps, regionId);
  cache.set(key, pending);
  void pending.then((value) => {
    if (!value) {
      cache.delete(key);
    }
  });
  return pending;
}
