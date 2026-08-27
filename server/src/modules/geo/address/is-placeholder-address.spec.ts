import { isPlaceholderAddress } from './is-placeholder-address';

describe('isPlaceholderAddress', () => {
  it('считает пустое значение заглушкой', () => {
    expect(isPlaceholderAddress(undefined)).toBe(true);
    expect(isPlaceholderAddress(null)).toBe(true);
    expect(isPlaceholderAddress('')).toBe(true);
    expect(isPlaceholderAddress('   ')).toBe(true);
  });

  it('распознаёт подпись GPS и точку на карте', () => {
    expect(isPlaceholderAddress('Моё местоположение')).toBe(true);
    expect(isPlaceholderAddress('Мое местоположение')).toBe(true);
    expect(isPlaceholderAddress('Мои местоположение')).toBe(true);
    expect(isPlaceholderAddress('My location')).toBe(true);
    expect(isPlaceholderAddress('Точка на карте (43.21890, 44.77100)')).toBe(true);
    expect(isPlaceholderAddress('43.2167, 44.7667')).toBe(true);
  });

  it('оставляет обычный адрес', () => {
    expect(isPlaceholderAddress('г. Назрань, ул. Московская, 12')).toBe(false);
    expect(isPlaceholderAddress('Магас')).toBe(false);
  });
});
