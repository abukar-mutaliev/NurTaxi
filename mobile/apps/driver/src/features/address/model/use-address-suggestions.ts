/**
 * Подсказки адресов (M3.3, `§8.9`).
 *
 * Источников два. Основной — Suggest из Yandex MapKit: он работает офлайн от нашего API,
 * отвечает быстрее и знает объекты, которых нет в серверном индексе. Запасной — `GET
 * /geo/search`: он нужен, когда MapKit собран во `flavor: 'lite'` или приложение запущено
 * без нативного модуля (Expo Go, старый dev client). Переключение автоматическое: адаптер
 * `yandex-geo` возвращает `null`, и хук навсегда уходит на серверный источник.
 *
 * Запрос уходит с задержкой и только начиная с `MIN_GEO_QUERY_LENGTH` символов — короткие
 * строки одинаково бесполезны обоим источникам.
 */
import { useCallback, useEffect, useState } from 'react';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { useDebouncedValue } from '@nurtaxi/shared-core/shared/lib';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { MIN_GEO_QUERY_LENGTH, useSearchAddressesQuery } from '@nurtaxi/shared-core/entities/geo';

import {
  isYandexGeoAvailable,
  resolveSuggestionPoint,
  suggestAddresses,
  type YandexSuggestion,
} from '@/shared/lib/yandex-geo';

const DEBOUNCE_MS = 400;

/**
 * Подсказка в виде, пригодном для показа. Координата может быть неизвестна: MapKit отдаёт
 * её не для каждого объекта, поэтому её дорезолвит `resolvePoint` в момент выбора.
 */
export interface AddressOption {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  point: GeoPoint | null;
}

export interface AddressSuggestionsOptions {
  /** Регион сужает выдачу серверного источника; Yandex его не использует. */
  regionId?: string | null;
  /** Точка отсчёта для сортировки по близости (например, текущая геопозиция). */
  lat?: number;
  lng?: number;
  limit?: number;
  /** Позволяет отключить запрос, пока поле не в фокусе или экран скрыт. */
  enabled?: boolean;
}

export interface AddressSuggestionsResult {
  suggestions: AddressOption[];
  isFetching: boolean;
  /** Запрос достаточно длинный, чтобы источник что-то искал. */
  isSearchable: boolean;
  /**
   * Текст ошибки, если запрос не прошёл. Пустая выдача и упавший запрос выглядят
   * одинаково («подсказок нет»), поэтому причину нужно показать явно.
   */
  error: string | null;
  /** Откуда пришла выдача — видно в отладке и в подписи под полем. */
  source: 'yandex' | 'server';
  /** Координата выбранной подсказки; может потребовать дозапроса к MapKit. */
  resolvePoint: (option: AddressOption) => Promise<GeoPoint | null>;
}

interface YandexState {
  query: string;
  items: YandexSuggestion[];
}

export function useAddressSuggestions(
  query: string,
  { regionId, lat, lng, limit = 6, enabled = true }: AddressSuggestionsOptions = {},
): AddressSuggestionsResult {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const isSearchable = debounced.length >= MIN_GEO_QUERY_LENGTH;

  // Живёт до конца сессии экрана: как только выяснилось, что MapKit не отвечает,
  // возвращаться к нему на каждый следующий символ бессмысленно.
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
    // Регион отправляем, только когда он выбран: пустая строка уходит в query как
    // `regionId=` и сервер отвечает 400 «regionId must be a UUID» — подсказок нет вовсе.
    { lat, limit, lng, q: debounced, regionId: regionId || undefined },
    { skip: !enabled || !isSearchable || useYandex },
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

  if (useYandex) {
    const isStale = yandexState?.query !== debounced;
    return {
      error: null,
      // Пока выдача не догнала текущий запрос, поле должно показывать «ищем»,
      // иначе на месте нового запроса на мгновение остаются старые подсказки.
      isFetching: isSearchable && isStale,
      isSearchable,
      resolvePoint,
      source: 'yandex',
      suggestions: isStale ? [] : (yandexState?.items ?? []),
    };
  }

  return {
    error: serverError ? toAppError(serverError).message : null,
    isFetching: serverFetching,
    isSearchable,
    resolvePoint,
    source: 'server',
    suggestions: serverSuggestions.map((suggestion) => ({
      address: suggestion.address,
      id: suggestion.id,
      point: { lat: suggestion.lat, lng: suggestion.lng },
      subtitle: suggestion.subtitle,
      title: suggestion.title,
    })),
  };
}
