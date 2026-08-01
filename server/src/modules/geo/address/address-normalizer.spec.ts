import { normalizeAddressQuery, scoreMatch, tokenizeQuery } from './address-normalizer';

describe('address-normalizer', () => {
  it('нормализует алиасы города Назрань', () => {
    expect(normalizeAddressQuery('Nazran ul. Moskovskaya')).toContain('назрань');
  });

  it('не портит уже каноническое название города', () => {
    expect(normalizeAddressQuery('Назрань')).toBe('назрань');
    expect(normalizeAddressQuery('Город Назрань, улица Богатырева 32')).toBe(
      'город назрань улица богатырева 32',
    );
  });

  it('дополняет сокращённое написание до канонического', () => {
    expect(normalizeAddressQuery('назран московская')).toBe('назрань московская');
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
