/**
 * Подсказки адресов из `GET /geo/search` (M3.3, `§8.9`).
 *
 * Запрос уходит с задержкой и только начиная с `MIN_GEO_QUERY_LENGTH` символов: сервер
 * всё равно отклонит более короткий запрос, а кэш Redis имеет смысл греть осмысленными
 * строками, а не каждой набранной буквой.
 */
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { useDebouncedValue } from '@nurtaxi/shared-core/shared/lib';
import type { AddressSuggestion } from '@nurtaxi/shared-core/shared/model';
import { MIN_GEO_QUERY_LENGTH, useSearchAddressesQuery } from '@nurtaxi/shared-core/entities/geo';

const DEBOUNCE_MS = 400;

export interface AddressSuggestionsOptions {
  /** Регион сужает выдачу; без него сервер ищет по всем активным регионам. */
  regionId?: string | null;
  /** Точка отсчёта для сортировки по близости (например, текущая геопозиция). */
  lat?: number;
  lng?: number;
  limit?: number;
  /** Позволяет отключить запрос, пока поле не в фокусе или экран скрыт. */
  enabled?: boolean;
}

export interface AddressSuggestionsResult {
  suggestions: AddressSuggestion[];
  isFetching: boolean;
  /** Запрос достаточно длинный, чтобы сервер что-то искал. */
  isSearchable: boolean;
  /**
   * Текст ошибки, если запрос не прошёл. Пустая выдача и упавший запрос выглядят
   * одинаково («подсказок нет»), поэтому причину нужно показать явно.
   */
  error: string | null;
}

export function useAddressSuggestions(
  query: string,
  { regionId, lat, lng, limit = 6, enabled = true }: AddressSuggestionsOptions = {},
): AddressSuggestionsResult {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const isSearchable = debounced.length >= MIN_GEO_QUERY_LENGTH;

  const {
    data: suggestions = [],
    isFetching,
    error,
  } = useSearchAddressesQuery(
    // Регион отправляем, только когда он выбран: пустая строка уходит в query как
    // `regionId=` и сервер отвечает 400 «regionId must be a UUID» — подсказок нет вовсе.
    { q: debounced, regionId: regionId || undefined, lat, lng, limit },
    { skip: !enabled || !isSearchable },
  );

  return {
    suggestions,
    isFetching,
    isSearchable,
    error: error ? toAppError(error).message : null,
  };
}
