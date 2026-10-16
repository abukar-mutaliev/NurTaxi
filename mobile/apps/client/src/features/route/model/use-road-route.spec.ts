import { isRoadGeometry, roadPolylineOrNull } from './use-road-route';

describe('isRoadGeometry', () => {
  it('отличает дорогу от прямой между двумя точками', () => {
    expect(
      isRoadGeometry([
        { lat: 43.2, lng: 44.7 },
        { lat: 43.21, lng: 44.71 },
      ]),
    ).toBe(false);
    expect(
      isRoadGeometry([
        { lat: 43.2, lng: 44.7 },
        { lat: 43.205, lng: 44.705 },
        { lat: 43.21, lng: 44.71 },
      ]),
    ).toBe(true);
    expect(isRoadGeometry(null)).toBe(false);
  });
});

describe('roadPolylineOrNull', () => {
  it('прячет полилинию из двух точек', () => {
    expect(roadPolylineOrNull('')).toBeNull();
    expect(roadPolylineOrNull(undefined)).toBeNull();
  });
});
