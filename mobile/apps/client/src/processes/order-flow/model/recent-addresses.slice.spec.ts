import {
  buildRecentAddress,
  makeRecentAddressId,
  recentAddressesReducer,
  recentAddressUsed,
  sanitizeRecentAddress,
  selectRecentAddresses,
} from './recent-addresses.slice';

describe('sanitizeRecentAddress', () => {
  it('приводит строковые координаты к числам', () => {
    const item = sanitizeRecentAddress({
      id: 'legacy',
      label: 'Дом',
      address: 'г. Назрань, ул. Московская, 1',
      lat: '43.21670' as unknown as number,
      lng: '44.76670' as unknown as number,
      usedAt: 1,
    });

    expect(item).toEqual({
      id: 'legacy',
      label: 'Дом',
      address: 'г. Назрань, ул. Московская, 1',
      lat: 43.2167,
      lng: 44.7667,
      usedAt: 1,
    });
  });

  it('подставляет label, если address отсутствует', () => {
    const item = sanitizeRecentAddress({
      label: 'г. Назрань, ул. Московская, 1',
      lat: 43.2167,
      lng: 44.7667,
    });

    expect(item?.address).toBe('г. Назрань, ул. Московская, 1');
    expect(item?.id).toBe(makeRecentAddressId(43.2167, 44.7667));
  });

  it('отбрасывает записи без текста и без координат', () => {
    expect(sanitizeRecentAddress({ lat: 43, lng: 44 })).toBeNull();
    expect(sanitizeRecentAddress({ address: 'Дом' })).toBeNull();
    expect(sanitizeRecentAddress(null)).toBeNull();
  });
});

describe('buildRecentAddress', () => {
  it('не вызывает toFixed на строковых координатах', () => {
    const item = buildRecentAddress({
      lat: '43.2167' as unknown as number,
      lng: '44.7667' as unknown as number,
      address: 'г. Назрань, ул. Московская, 1',
    });

    expect(item.id).toBe('43.21670_44.76670');
    expect(item.lat).toBe(43.2167);
  });
});

describe('recentAddressesReducer', () => {
  it('игнорирует битую запись вместо падения', () => {
    const state = recentAddressesReducer(
      { items: [] },
      recentAddressUsed({
        id: '',
        label: '',
        address: '',
        lat: Number.NaN,
        lng: Number.NaN,
        usedAt: 0,
      }),
    );

    expect(state.items).toEqual([]);
  });

  it('не переставляет уже существующий адрес в списке', () => {
    const first = buildRecentAddress({
      lat: 43.2,
      lng: 44.7,
      address: 'Первый',
    });
    const second = buildRecentAddress({
      lat: 43.3,
      lng: 44.8,
      address: 'Второй',
    });
    const withTwo = recentAddressesReducer(
      recentAddressesReducer({ items: [] }, recentAddressUsed(first)),
      recentAddressUsed(second),
    );

    const reused = recentAddressesReducer(withTwo, recentAddressUsed(first));
    expect(reused.items.map((item) => item.address)).toEqual(['Второй', 'Первый']);
  });
});

describe('selectRecentAddresses', () => {
  it('не падает, если persist отдал items = undefined', () => {
    expect(
      selectRecentAddresses({
        recentAddresses: { items: undefined as unknown as [] },
      }),
    ).toEqual([]);
  });
});
