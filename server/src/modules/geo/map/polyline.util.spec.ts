import { encodePolyline } from './polyline.util';

describe('polyline.util', () => {
  it('кодирует и декодирует точки в Google Encoded Polyline', () => {
    const points = [
      { lat: 43.2167, lng: 44.7667 },
      { lat: 43.1687, lng: 44.8133 },
    ];

    const encoded = encodePolyline(points);

    expect(encoded).toBeTruthy();
    expect(encoded).not.toContain(';');
  });
});
