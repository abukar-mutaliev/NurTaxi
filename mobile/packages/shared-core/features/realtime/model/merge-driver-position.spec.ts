import { mergeDriverPosition, type DriverPosition } from './merge-driver-position';

const base: DriverPosition = {
  at: '2026-01-01T10:00:01.000Z',
  heading: null,
  lat: 43.1,
  lng: 44.8,
};

describe('mergeDriverPosition', () => {
  it('кладёт первую точку', () => {
    expect(mergeDriverPosition(undefined, { at: base.at, lat: base.lat, lng: base.lng })).toEqual(
      base,
    );
  });

  it('не откатывает машину на более старую точку', () => {
    const fresh: DriverPosition = {
      at: '2026-01-01T10:00:02.000Z',
      heading: 90,
      lat: 43.2,
      lng: 44.9,
    };

    expect(
      mergeDriverPosition(fresh, { at: '2026-01-01T10:00:01.000Z', lat: 43.1, lng: 44.8 }),
    ).toBeNull();
  });

  it('принимает более новую точку', () => {
    expect(
      mergeDriverPosition(base, {
        at: '2026-01-01T10:00:02.000Z',
        heading: 180,
        lat: 43.2,
        lng: 44.9,
      }),
    ).toEqual({
      at: '2026-01-01T10:00:02.000Z',
      heading: 180,
      lat: 43.2,
      lng: 44.9,
    });
  });

  it('игнорирует повтор того же события', () => {
    expect(
      mergeDriverPosition({ ...base, eta: '5 мин' }, { at: base.at, lat: base.lat, lng: base.lng }),
    ).toBeNull();
  });

  it('держит линию и время, пока водитель их не прислал снова', () => {
    expect(
      mergeDriverPosition(
        { ...base, eta: '5 мин', route: 'abc' },
        { at: '2026-01-01T10:00:02.000Z', lat: 43.2, lng: 44.9 },
      ),
    ).toMatchObject({ eta: '5 мин', route: 'abc' });
  });

  it('не подставляет прошлый курс', () => {
    expect(
      mergeDriverPosition(
        { ...base, heading: 90 },
        { at: '2026-01-01T10:00:02.000Z', lat: 43.2, lng: 44.9 },
      )?.heading,
    ).toBeNull();
  });
});
