import {
  extractLocalityFromAddress,
  formatShortDisplayAddress,
  isAdminOnlyAddress,
} from './short-address';

describe('formatShortDisplayAddress', () => {
  it('убирает республику и район', () => {
    expect(
      formatShortDisplayAddress(
        'Республика Ингушетия, Сунженский район, г. Назрань, ул. Московская, 12',
      ),
    ).toBe('г. Назрань, ул. Московская, 12');
  });

  it('оставляет короткий адрес без изменений', () => {
    expect(formatShortDisplayAddress('г. Назрань, ул. Московская, 10')).toBe(
      'г. Назрань, ул. Московская, 10',
    );
  });

  it('убирает страну и регион', () => {
    expect(formatShortDisplayAddress('Россия, Республика Ингушетия, г. Магас, ул. Ленина, 3')).toBe(
      'г. Магас, ул. Ленина, 3',
    );
  });

  it('не меняет служебную строку точки на карте', () => {
    expect(formatShortDisplayAddress('Точка на карте (43.21890, 44.77100)')).toBe(
      'Точка на карте (43.21890, 44.77100)',
    );
  });

  it('возвращает пустую строку для одного административного сегмента', () => {
    expect(formatShortDisplayAddress('Республика Ингушетия')).toBe('');
  });

  it('определяет адрес только из региона и района', () => {
    expect(isAdminOnlyAddress('Республика Ингушетия, Сунженский район')).toBe(true);
  });

  it('извлекает населённый пункт без улицы', () => {
    expect(extractLocalityFromAddress('г. Назрань, ул. Московская, 12')).toBe('г. Назрань');
    expect(extractLocalityFromAddress('г. Назрань')).toBe('г. Назрань');
  });

  it('сохраняет улицу без префикса «ул.»', () => {
    expect(formatShortDisplayAddress('г. Назрань, Московская улица, 12')).toBe(
      'г. Назрань, Московская улица, 12',
    );
  });

  it('сохраняет улицу при длинной цепочке', () => {
    expect(
      formatShortDisplayAddress(
        'Россия, Республика Ингушетия, Сунженский район, г. Назрань, Московская улица, 12',
      ),
    ).toBe('г. Назрань, Московская улица, 12');
  });

  it('не падает на пустом и нестроковом значении', () => {
    expect(formatShortDisplayAddress(undefined)).toBe('');
    expect(formatShortDisplayAddress(null)).toBe('');
    expect(formatShortDisplayAddress('')).toBe('');
    expect(isAdminOnlyAddress(undefined)).toBe(true);
    expect(extractLocalityFromAddress(undefined)).toBeNull();
  });
});
