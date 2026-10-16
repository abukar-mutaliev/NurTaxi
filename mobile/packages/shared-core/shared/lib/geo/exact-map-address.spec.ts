import { isExactStreetAddress } from '../format/short-address';
import { exactAddressFromMapHit, exactAddressFromText } from './exact-map-address';

describe('exactAddressFromMapHit', () => {
  it('собирает улицу и дом из компонентов карты', () => {
    expect(
      exactAddressFromMapHit({
        formattedAddress: 'Россия, Республика Ингушетия, Назрань',
        addressComponents: [
          { name: 'Россия', kinds: ['country'] },
          { name: 'Назрань', kinds: ['locality'] },
          { name: 'улица Московская', kinds: ['street'] },
          { name: '12', kinds: ['house'] },
        ],
      }),
    ).toBe('Назрань, улица Московская, 12');
  });

  it('берёт отформатированную строку, если в ней есть улица и дом', () => {
    expect(
      exactAddressFromMapHit({
        formattedAddress: 'Россия, Республика Ингушетия, г. Назрань, ул. Московская, 12',
      }),
    ).toBe('г. Назрань, ул. Московская, 12');
  });

  it('не подставляет город и подпись точки на карте', () => {
    expect(
      exactAddressFromMapHit({
        addressComponents: [{ name: 'Назрань', kinds: ['locality'] }],
        formattedAddress: 'г. Назрань',
      }),
    ).toBeNull();
    expect(
      exactAddressFromMapHit({ formattedAddress: 'Точка на карте (43.21890, 44.77100)' }),
    ).toBeNull();
    expect(exactAddressFromMapHit(null)).toBeNull();
  });
});

describe('exactAddressFromText', () => {
  it('оставляет только адрес с улицей и домом', () => {
    expect(exactAddressFromText('г. Назрань, ул. Московская, 12')).toBe(
      'г. Назрань, ул. Московская, 12',
    );
    expect(exactAddressFromText('г. Назрань')).toBeNull();
    expect(exactAddressFromText('ул. Московская')).toBeNull();
    expect(isExactStreetAddress('Московская улица, 12')).toBe(true);
    expect(isExactStreetAddress('43.2167, 44.7667')).toBe(false);
  });
});
