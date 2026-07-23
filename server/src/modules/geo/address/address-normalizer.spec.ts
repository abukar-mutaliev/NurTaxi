import { normalizeAddressQuery, scoreMatch, tokenizeQuery } from './address-normalizer';

describe('address-normalizer', () => {
  it('нормализует алиасы города Назрань', () => {
    expect(normalizeAddressQuery('Nazran ul. Moskovskaya')).toContain('назрань');
  });

  it('приводит ё к е', () => {
    expect(normalizeAddressQuery('ул. Овсянникова')).toBe('ул овсянникова');
  });

  it('ранжирует точное совпадение выше частичного', () => {
    const q = normalizeAddressQuery('назрань московская');
    const tokens = tokenizeQuery(q);
    const exact = scoreMatch(q, tokens, 'назрань ул московская');
    const partial = scoreMatch(q, tokens, 'назрань центр');
    expect(exact).toBeGreaterThan(partial);
  });
});
