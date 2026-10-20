import { formatMoney, formatPrice } from './units';

/** Intl ставит неразрывные пробелы — для сравнения приводим их к обычным. */
const plain = (value: string) => value.replace(/\s/gu, ' ');

describe('formatPrice', () => {
  it('округляет цену поездки до десятков без копеек', () => {
    expect(plain(formatPrice(321.32))).toBe('320 ₽');
    expect(plain(formatPrice(325))).toBe('330 ₽');
    expect(plain(formatPrice(149))).toBe('150 ₽');
    expect(plain(formatPrice(1284.5))).toBe('1 280 ₽');
  });
});

describe('formatMoney', () => {
  it('показывает сумму без копеек', () => {
    expect(plain(formatMoney(13860.26))).toBe('13 860 ₽');
    expect(plain(formatMoney(48.5))).toBe('49 ₽');
    expect(plain(formatMoney(0))).toBe('0 ₽');
  });
});
