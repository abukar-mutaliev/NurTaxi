import { normalizePhone } from './phone.util';

describe('normalizePhone', () => {
  it.each([
    ['+79280000000', '+79280000000'],
    ['89280000000', '+79280000000'],
    ['79280000000', '+79280000000'],
    ['9280000000', '+79280000000'],
    ['+7 (928) 000-00-00', '+79280000000'],
    ['8 928 000 00 00', '+79280000000'],
  ])('нормализует %s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('возвращает пустую строку для не-строки', () => {
    expect(normalizePhone(undefined)).toBe('');
    expect(normalizePhone(12345 as unknown)).toBe('');
  });
});
