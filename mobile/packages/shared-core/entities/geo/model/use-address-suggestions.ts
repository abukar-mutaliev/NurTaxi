/**
 * Подсказки адресов (M3.3, `§8.9`).
 *
 * Источников два. Основной — Suggest из Yandex MapKit: без географической рамки,
 * знает Пятигорск, Тбилиси и любые другие точки. Запасной — `GET /geo/search`,
 * когда MapKit собран во `flavor: 'lite'` или модуля нет (Expo Go).
 */
import { useCallback, useEffect, useState } from 'react';

import { toAppError } from '../../../shared/api';
import { useDebouncedValue } from '../../../shared/lib';
import {
  isYandexGeoAvailable,
  resolveSuggestionPoint,
  suggestAddresses,
  type YandexSuggestion,
} from '../../../shared/lib/yandex-geo';
import type { AddressSuggestion, GeoPoint } from '../../../shared/model';
import { MIN_GEO_QUERY_LENGTH, useSearchAddressesQuery } from '../api/geo.api';

const DEBOUNCE_MS = 400;

export interface AddressOption {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  point: GeoPoint | null;
}

export interface AddressSuggestionsOptions {
  /** Передаётся только серверному запасному источнику. */
  regionId?: string | null;
  lat?: number;
  lng?: number;
  limit?: number;
  enabled?: boolean;
}

export interface AddressSuggestionsResult {
  suggestions: AddressOption[];
  isFetching: boolean;
  isSearchable: boolean;
  error: string | null;
  source: 'yandex' | 'server';
  resolvePoint: (option: AddressOption) => Promise<GeoPoint | null>;
}

interface YandexState {
  query: string;
  items: YandexSuggestion[];
}

export function toAddressSuggestion(option: AddressOption, point: GeoPoint): AddressSuggestion {
  return {
    id: option.id,
    title: option.title,
    subtitle: option.subtitle,
    address: option.address,
    lat: point.lat,
    lng: point.lng,
  };
}

export function useAddressSuggestions(
  query: string,
  { regionId, lat, lng, limit = 6, enabled = true }: AddressSuggestionsOptions = {},
): AddressSuggestionsResult {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const isSearchable = debounced.length >= MIN_GEO_QUERY_LENGTH;

  const [yandexSupported, setYandexSupported] = useState(isYandexGeoAvailable);
  const [yandexState, setYandexState] = useState<YandexState | null>(null);

  const useYandex = enabled && yandexSupported;
  const wantsYandex = useYandex && isSearchable;

  useEffect(() => {
    if (!wantsYandex) {
      return;
    }

    let cancelled = false;
    const near = lat !== undefined && lng !== undefined ? { lat, lng } : null;

    void suggestAddresses(debounced, { limit, near }).then((items) => {
      if (cancelled) {
        return;
      }
      if (items === null) {
        setYandexSupported(false);
        return;
      }
      setYandexState({ items, query: debounced });
    });

    return () => {
      cancelled = true;
    };
  }, [wantsYandex, debounced, lat, lng, limit]);

  const {
    data: serverSuggestions = [],
    isFetching: serverFetching,
    error: serverError,
  } = useSearchAddressesQuery(
    { lat, limit, lng, q: debounced, regionId: regionId || undefined },
    { skip: !enabled || !isSearchable },
  );

  const resolvePoint = useCallback(
    async (option: AddressOption): Promise<GeoPoint | null> => {
      if (option.point) {
        return option.point;
      }
      const item = yandexState?.items.find((candidate) => candidate.id === option.id);
      return item ? resolveSuggestionPoint(item) : null;
    },
    [yandexState],
  );

  const serverOptions: AddressOption[] = serverSuggestions.map((suggestion) => ({
    address: suggestion.address,
    id: suggestion.id,
    point: { lat: suggestion.lat, lng: suggestion.lng },
    subtitle: suggestion.subtitle,
    title: suggestion.title,
  }));

  if (useYandex) {
    const isStale = yandexState?.query !== debounced;
    const yandexItems = isStale ? [] : (yandexState?.items ?? []);
    return {
      error: serverError && yandexItems.length === 0 ? toAppError(serverError).message : null,
      isFetching: isSearchable && isStale && serverFetching,
      isSearchable,
      resolvePoint,
      source: yandexItems.length > 0 ? 'yandex' : 'server',
      suggestions: mergeAddressOptions(yandexItems, serverOptions, limit),
    };
  }

  return {
    error: serverError ? toAppError(serverError).message : null,
    isFetching: serverFetching,
    isSearchable,
    resolvePoint,
    source: 'server',
    suggestions: serverOptions,
  };
}

function mergeAddressOptions(
  primary: AddressOption[],
  extra: AddressOption[],
  limit: number,
): AddressOption[] {
  const merged: AddressOption[] = [];
  const seen = new Set<string>();

  for (const item of [...primary, ...extra]) {
    const point = item.point;
    const key = point
      ? `${item.title.trim().toLowerCase()}:${point.lat.toFixed(3)}:${point.lng.toFixed(3)}`
      : item.id;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
}
