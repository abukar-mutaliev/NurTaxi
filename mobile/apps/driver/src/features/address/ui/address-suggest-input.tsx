/**
 * Поле адреса с серверными подсказками.
 *
 * Единая точка для всех адресных вводов приложения водителя: подсказка, состояние
 * «ищем», подпись при пустой выдаче и координаты выбранного адреса — всё здесь,
 * экранам остаётся передать значение и обработчики.
 */
import type { AddressSuggestion } from '@nurtaxi/shared-core/shared/model';

import { SuggestInput, type SuggestInputProps, type SuggestOption } from '@/shared/ui/suggest-input';

import {
  useAddressSuggestions,
  type AddressSuggestionsOptions,
} from '../model/use-address-suggestions';

export interface AddressSuggestInputProps
  extends Omit<SuggestInputProps, 'options' | 'onSelect' | 'loading' | 'emptyHint'>,
    Omit<AddressSuggestionsOptions, 'enabled'> {
  /**
   * Вызывается при выборе подсказки — вместе с координатами. Текст поля компонент
   * подставляет сам через `onChangeText`.
   */
  onSelectSuggestion?: (suggestion: AddressSuggestion) => void;
  /** Подпись, когда сервер ничего не нашёл. */
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
  const { suggestions, isFetching, isSearchable, error } = useAddressSuggestions(value, {
    regionId,
    lat,
    lng,
    limit,
  });

  const options: SuggestOption[] = suggestions.map((suggestion) => ({
    id: suggestion.id,
    title: suggestion.title,
    subtitle: suggestion.subtitle,
  }));

  const handleSelect = (option: SuggestOption) => {
    const suggestion = suggestions.find((item) => item.id === option.id);
    if (!suggestion) {
      return;
    }
    onChangeText(suggestion.address || suggestion.title);
    onSelectSuggestion?.(suggestion);
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
