import { getMarkerAnchor } from '@nurtaxi/shared-core/widgets/map/ui/map-marker.constants';

describe('getMarkerAnchor', () => {
  it('крепит пин кончиком, а не левым краем', () => {
    expect(getMarkerAnchor('pickup')).toEqual({ x: 0.5, y: 1 });
    expect(getMarkerAnchor('dropoff')).toEqual({ x: 0.5, y: 1 });
  });

  it('крепит машинку центром', () => {
    expect(getMarkerAnchor('driver')).toEqual({ x: 0.5, y: 0.5 });
  });
});
