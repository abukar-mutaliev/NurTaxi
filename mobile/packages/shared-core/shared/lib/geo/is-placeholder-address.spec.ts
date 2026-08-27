import { isPlaceholderAddress } from './is-placeholder-address';

describe('isPlaceholderAddress', () => {
  it('распознаёт GPS-подпись и координаты', () => {
    expect(isPlaceholderAddress('Моё местоположение')).toBe(true);
    expect(isPlaceholderAddress('Мои местоположение')).toBe(true);
    expect(isPlaceholderAddress('My location')).toBe(true);
    expect(isPlaceholderAddress('Точка на карте (43.21, 44.77)')).toBe(true);
    expect(isPlaceholderAddress('43.2167, 44.7667')).toBe(true);
  });

  it('учитывает локализованную подпись', () => {
    expect(isPlaceholderAddress('Моё местоположение', ['Моё местоположение'])).toBe(true);
  });

  it('оставляет улицу', () => {
    expect(isPlaceholderAddress('г. Назрань, ул. Московская, 12')).toBe(false);
  });
});
