import { formatDisplayAddress } from './format-display-address';

describe('formatDisplayAddress', () => {
  it('убирает страну и регион', () => {
    expect(
      formatDisplayAddress('Россия, Республика Ингушетия, г. Назрань, ул. Московская, 12'),
    ).toBe('г. Назрань, ул. Московская, 12');
  });

  it('оставляет уже короткий адрес', () => {
    expect(formatDisplayAddress('г. Магас, ул. Ленина, 3')).toBe('г. Магас, ул. Ленина, 3');
  });

  it('возвращает пустую строку для пустого ввода', () => {
    expect(formatDisplayAddress(undefined)).toBe('');
    expect(formatDisplayAddress('')).toBe('');
  });
});
