import { createFixFilter, fixFromCoords } from './driver-fix';

describe('fixFromCoords', () => {
  it('отдаёт курс, когда машина едет', () => {
    const fix = fixFromCoords({
      accuracy: 6,
      heading: 271.5,
      latitude: 43.1,
      longitude: 44.8,
      speed: 12,
    });

    expect(fix).toEqual({ accuracy: 6, heading: 271.5, lat: 43.1, lng: 44.8, speed: 12 });
  });

  it('не верит курсу на стоянке: Android отдаёт там 0, то есть «на север»', () => {
    expect(fixFromCoords({ heading: 0, latitude: 1, longitude: 2, speed: 0 }).heading).toBeNull();
    expect(
      fixFromCoords({ heading: 90, latitude: 1, longitude: 2, speed: 0.8 }).heading,
    ).toBeNull();
  });

  it('не верит курсу без скорости', () => {
    expect(fixFromCoords({ heading: 90, latitude: 1, longitude: 2 }).heading).toBeNull();
    expect(
      fixFromCoords({ heading: 90, latitude: 1, longitude: 2, speed: null }).heading,
    ).toBeNull();
  });

  it('отбрасывает «неизвестно» в виде -1, как его отдаёт iOS', () => {
    const fix = fixFromCoords({ accuracy: -1, heading: -1, latitude: 1, longitude: 2, speed: -1 });

    expect(fix.heading).toBeNull();
    expect(fix.speed).toBeNull();
    expect(fix.accuracy).toBeNull();
  });

  it('приводит курс 360 к нулю', () => {
    expect(fixFromCoords({ heading: 360, latitude: 1, longitude: 2, speed: 10 }).heading).toBe(0);
  });
});

describe('createFixFilter', () => {
  it('пропускает точные точки и точки без оценки погрешности', () => {
    const accept = createFixFilter();

    expect(accept({ accuracy: 8 }, 0)).toBe(true);
    expect(accept({ accuracy: null }, 1000)).toBe(true);
  });

  it('отбрасывает грубую точку, пока свежа точная', () => {
    const accept = createFixFilter();

    expect(accept({ accuracy: 8 }, 0)).toBe(true);
    expect(accept({ accuracy: 300 }, 2000)).toBe(false);
    expect(accept({ accuracy: 300 }, 9000)).toBe(false);
  });

  it('берёт грубую точку, если точных давно нет', () => {
    const accept = createFixFilter();

    expect(accept({ accuracy: 8 }, 0)).toBe(true);
    expect(accept({ accuracy: 300 }, 11_000)).toBe(true);
  });

  it('берёт грубую точку, если точной не было вовсе', () => {
    const accept = createFixFilter();

    expect(accept({ accuracy: 300 }, 0)).toBe(true);
  });
});
