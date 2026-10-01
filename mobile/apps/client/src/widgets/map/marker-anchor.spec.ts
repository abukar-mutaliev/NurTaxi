import {
  MAP_MARKER_ASSET_SCALE,
  MAP_MARKER_ICON_SCALE,
  MAP_PIN_SIZE,
  getMarkerAnchor,
} from '@nurtaxi/shared-core/widgets/map/ui/map-marker.constants';

describe('getMarkerAnchor', () => {
  it('крепит пин центром точки под кружком, а не краем растра', () => {
    const anchor = getMarkerAnchor('pickup');

    expect(anchor.x).toBe(0.5);
    // Центр точки — (24, 54) dp на холсте 48×60: точка целиком внутри растра, кружок над ней.
    expect(anchor.y).toBeCloseTo(54 / MAP_PIN_SIZE.height, 6);
    expect(anchor.y).toBeLessThan(1);
    expect(getMarkerAnchor('dropoff')).toEqual(anchor);
  });

  it('крепит машинку центром', () => {
    expect(getMarkerAnchor('driver')).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('MAP_MARKER_ICON_SCALE', () => {
  it('положительный и приводит растр @3x к логическому размеру', () => {
    expect(MAP_MARKER_ASSET_SCALE).toBe(3);
    expect(MAP_MARKER_ICON_SCALE).toBeGreaterThan(0);
    expect(Number.isFinite(MAP_MARKER_ICON_SCALE)).toBe(true);
  });
});
