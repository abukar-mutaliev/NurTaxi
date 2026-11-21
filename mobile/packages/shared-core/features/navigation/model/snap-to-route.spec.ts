import { haversineDistance } from '@nurtaxi/shared-core/shared/lib/geo/polyline';

import { snapToRoute } from './snap-to-route';

/** Улица с востока на запад, затем поворот на север. */
const CORNER = { lat: 43.2, lng: 44.81 };
const ROUTE = [{ lat: 43.2, lng: 44.8 }, CORNER, { lat: 43.21, lng: 44.81 }];

/** Сдвиг точки на метры: 1° широты ≈ 111,3 км. */
function shift(point: { lat: number; lng: number }, northM: number, eastM: number) {
  return {
    lat: point.lat + northM / 111_320,
    lng: point.lng + eastM / (111_320 * Math.cos((point.lat * Math.PI) / 180)),
  };
}

describe('snapToRoute', () => {
  it('ставит машину на линию, если GPS увёл её на обочину', () => {
    const onRoad = { lat: 43.2, lng: 44.805 };
    const snapped = snapToRoute(shift(onRoad, 12, 0), ROUTE);

    expect(haversineDistance(snapped, onRoad)).toBeLessThan(0.5);
  });

  it('не трогает машину, которая едет по другой улице', () => {
    const elsewhere = shift({ lat: 43.2, lng: 44.805 }, 80, 0);

    expect(snapToRoute(elsewhere, ROUTE)).toBe(elsewhere);
  });

  it('у поворота выбирает ближайший из двух участков', () => {
    // В 20 м севернее угла и в 5 м восточнее: ближе участок, идущий на север.
    const snapped = snapToRoute(shift(CORNER, 20, 5), ROUTE);

    expect(snapped.lng).toBeCloseTo(CORNER.lng, 6);
    expect(haversineDistance(snapped, shift(CORNER, 20, 0))).toBeLessThan(0.5);
  });

  it('не выносит машину за конец линии', () => {
    const end = ROUTE[2]!;
    const snapped = snapToRoute(shift(end, 15, 3), ROUTE);

    expect(haversineDistance(snapped, end)).toBeLessThan(0.5);
  });

  it('учитывает заданный предел расстояния', () => {
    const off = shift({ lat: 43.2, lng: 44.805 }, 20, 0);

    expect(snapToRoute(off, ROUTE, 10)).toBe(off);
    expect(snapToRoute(off, ROUTE, 25)).not.toBe(off);
  });

  it('без линии отдаёт точку как есть', () => {
    const point = { lat: 43.2, lng: 44.8 };

    expect(snapToRoute(point, null)).toBe(point);
    expect(snapToRoute(point, [])).toBe(point);
    expect(snapToRoute(point, [point])).toBe(point);
  });

  it('точку, уже лежащую на линии, не подменяет новой', () => {
    const start = ROUTE[0]!;

    expect(snapToRoute(start, ROUTE)).toBe(start);
  });
});
