import { toStoredGeoLocation } from './location';

describe('toStoredGeoLocation', () => {
  const point = { lat: 43.2189, lng: 44.771, address: 'Моё местоположение' };

  it('подставляет улицу вместо GPS-подписи', () => {
    expect(toStoredGeoLocation(point, 'г. Назрань, ул. Московская, 12')).toEqual({
      lat: 43.2189,
      lng: 44.771,
      address: 'г. Назрань, ул. Московская, 12',
    });
  });

  it('оставляет исходный адрес, если геокодер ещё не ответил', () => {
    expect(toStoredGeoLocation(point)).toEqual(point);
  });
});
