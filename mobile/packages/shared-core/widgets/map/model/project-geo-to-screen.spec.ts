import { projectGeoToScreen } from './project-geo-to-screen';

const MAGAS = { lat: 43.1687, lng: 44.8133 };
const MAP_SIZE = { height: 800, width: 400 };

describe('projectGeoToScreen', () => {
  it('ставит точку камеры в центр карты', () => {
    expect(
      projectGeoToScreen(MAGAS, { latitude: MAGAS.lat, longitude: MAGAS.lng, zoom: 14 }, MAP_SIZE),
    ).toEqual({ x: 200, y: 400 });
  });

  it('сдвигает точку восточнее камеры вправо', () => {
    const screen = projectGeoToScreen(
      { lat: MAGAS.lat, lng: MAGAS.lng + 0.01 },
      { latitude: MAGAS.lat, longitude: MAGAS.lng, zoom: 14 },
      MAP_SIZE,
    );

    expect(screen).not.toBeNull();
    expect(screen!.x).toBeGreaterThan(200);
    expect(screen!.y).toBeCloseTo(400, 0);
  });

  it('держит смещение в логических пикселях и не сжимает его к центру', () => {
    const screen = projectGeoToScreen(
      { lat: MAGAS.lat, lng: MAGAS.lng + 0.01 },
      { latitude: MAGAS.lat, longitude: MAGAS.lng, zoom: 14 },
      MAP_SIZE,
    );
    const worldWidth = 256 * 2 ** 14;

    expect(screen!.x).toBeCloseTo(MAP_SIZE.width / 2 + (0.01 / 360) * worldWidth, 5);
  });
});
