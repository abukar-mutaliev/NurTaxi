import type { AddressSuggestion } from '@nurtaxi/shared-core/shared/model';

import {
  formatSaveAddressText,
  formatSuggestionInsertText,
  suggestionToGeoLocation,
} from './format-suggestion-address';

const suggestion = (overrides: Partial<AddressSuggestion> = {}): AddressSuggestion => ({
  id: '1',
  title: 'Московская',
  subtitle: 'г. Назрань',
  address: 'г. Назрань, ул. Московская, 1',
  lat: 43.2167,
  lng: 44.7667,
  ...overrides,
});

describe('formatSaveAddressText', () => {
  it('не падает на пустом адресе из истории', () => {
    expect(formatSaveAddressText(undefined)).toBe('');
    expect(formatSaveAddressText(null)).toBe('');
  });
});

describe('suggestionToGeoLocation', () => {
  it('не падает, если у подсказки нет title', () => {
    const item = suggestion({ title: undefined as unknown as string, address: '' });

    expect(() => suggestionToGeoLocation(item)).not.toThrow();
    expect(suggestionToGeoLocation(item).address).toBe('г. Назрань');
  });
});

describe('formatSuggestionInsertText', () => {
  it('берёт subtitle, если title пустой', () => {
    expect(formatSuggestionInsertText(suggestion({ title: '', address: '' }))).toBe('г. Назрань');
  });
});
