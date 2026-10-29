import { closeUpCenter } from './close-up-center';

describe('closeUpCenter', () => {
  it('даёт середину, когда машина уже у точки подачи', () => {
    const center = closeUpCenter([
      { latitude: 43.2201, longitude: 44.7701 },
      { latitude: 43.2203, longitude: 44.7703 },
    ]);
    expect(center?.latitude).toBeCloseTo(43.2202, 6);
    expect(center?.longitude).toBeCloseTo(44.7702, 6);
  });

  it('не вмешивается, когда точки разнесены по городу', () => {
    expect(
      closeUpCenter([
        { latitude: 43.22, longitude: 44.77 },
        { latitude: 43.19, longitude: 44.79 },
      ]),
    ).toBeNull();
  });

  it('ничего не возвращает без точек', () => {
    expect(closeUpCenter([])).toBeNull();
  });
});
