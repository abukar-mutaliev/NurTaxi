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

  it('оставляет город и улицу из полного российского адреса', () => {
    const item = suggestion({
      title: 'улица Муталиева, 32',
      subtitle: 'Назрань, Республика Ингушетия, Россия',
      address: 'Россия, Республика Ингушетия, Назрань, улица Муталиева, 32',
    });
    expect(formatSuggestionInsertText(item)).toBe('Назрань, улица Муталиева, 32');
  });

  /**
   * Пассажир набрал «село Экажево», а выбрал подсказку из Торуня: раньше в поле выходило
   * «село Экажево, улица Юрия Гагарина, 20» с координатами Польши и ценой за 3 000 км.
   */
  it('называет город самой подсказки, а не набранный пассажиром', () => {
    const torun = suggestion({
      title: 'улица Юрия Гагарина, 20',
      subtitle: 'Торунь, Куявско-Поморское воеводство, Польша',
      address: 'Польша, Куявско-Поморское воеводство, Торунь, улица Юрия Гагарина, 20',
      lat: 53.019612,
      lng: 18.564251,
    });
    expect(suggestionToGeoLocation(torun)).toEqual({
      lat: 53.019612,
      lng: 18.564251,
      address: 'Торунь, улица Юрия Гагарина, 20',
    });
  });

  it('берёт город из подписи, если в адресе подсказки только улица', () => {
    const mapkit = suggestion({
      title: 'улица Юрия Гагарина, 20',
      subtitle: 'Торунь, Польша',
      address: 'улица Юрия Гагарина, 20',
    });
    expect(formatSuggestionInsertText(mapkit)).toBe('Торунь, улица Юрия Гагарина, 20');
  });
});
