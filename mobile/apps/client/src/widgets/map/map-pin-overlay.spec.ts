import {
  MAP_PIN_HEIGHT,
  MAP_PIN_WIDTH,
  pinOverlayStyle,
} from '@nurtaxi/shared-core/widgets/map/ui/map-marker.constants';

describe('pinOverlayStyle', () => {
  it('ставит кончик ножки в экранную точку, а не левый край пина', () => {
    expect(pinOverlayStyle({ x: 200, y: 400 })).toEqual({
      left: 200 - MAP_PIN_WIDTH / 2,
      top: 400 - MAP_PIN_HEIGHT,
    });
  });
});
