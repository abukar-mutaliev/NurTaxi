/**
 * Поле адреса с подсказками.
 *
 * Единая точка для всех адресных вводов приложения водителя: подсказка, состояние
 * «ищем», подпись при пустой выдаче и координаты выбранного адреса — всё здесь,
 * экранам остаётся передать значение и обработчики. Источник подсказок (Yandex MapKit
 * или серверный `/geo/search`) выбирает `useAddressSuggestions`.
 */
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

import {
  SuggestInput,
  type SuggestInputProps,
  type SuggestOption,
} from '@/shared/ui/suggest-input';

import {
  useAddressSuggestions,
  type AddressOption,
  type AddressSuggestionsOptions,
} from '../model/use-address-suggestions';

export interface AddressSuggestInputProps
  extends
    Omit<SuggestInputProps, 'options' | 'onSelect' | 'loading' | 'emptyHint'>,
    Omit<AddressSuggestionsOptions, 'enabled'> {
  /**
   * Вызывается при выборе подсказки. Координата может прийти позже самого текста —
   * MapKit отдаёт её не для каждого объекта, — поэтому `point` бывает `null`.
   * Текст поля компонент подставляет сам через `onChangeText`.
   */
  onSelectSuggestion?: (suggestion: AddressOption & { point: GeoPoint | null }) => void;
  /** Подпись, когда ничего не нашлось. */
  emptyHint?: string;
}

const DEFAULT_EMPTY_HINT = 'Ничего не нашлось — введите вручную';

export function AddressSuggestInput({
  value,
  onChangeText,
  onSelectSuggestion,
  regionId,
  lat,
  lng,
  limit,
  emptyHint = DEFAULT_EMPTY_HINT,
  ...inputProps
}: AddressSuggestInputProps) {
  const { suggestions, isFetching, isSearchable, error, resolvePoint } = useAddressSuggestions(
    value,
    { lat, limit, lng, regionId },
  );

  const options: SuggestOption[] = suggestions.map((suggestion) => ({
    id: suggestion.id,
    subtitle: suggestion.subtitle,
    title: suggestion.title,
  }));

  const handleSelect = (option: SuggestOption) => {
    const suggestion = suggestions.find((item) => item.id === option.id);
    if (!suggestion) {
      return;
    }

    onChangeText(suggestion.address || suggestion.title);

    if (!onSelectSuggestion) {
      return;
    }

    // Координату дозапрашиваем, но текст в поле не ждёт ответа: ввод не должен
    // подвисать из-за сетевого дозапроса к MapKit.
    void resolvePoint(suggestion).then((point) => {
      onSelectSuggestion({ ...suggestion, point });
    });
  };

  return (
    <SuggestInput
      {...inputProps}
      emptyHint={isSearchable && !isFetching ? emptyHint : undefined}
      errorHint={error ? `Подсказки недоступны: ${error}` : null}
      loading={isFetching}
      onChangeText={onChangeText}
      onSelect={handleSelect}
      options={options}
      value={value}
    />
  );
}
