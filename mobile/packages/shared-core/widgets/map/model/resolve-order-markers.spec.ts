import { resolveOrderMapMarkers } from './resolve-order-markers';

describe('resolveOrderMapMarkers', () => {
  it('возвращает оба маркера при валидных точках', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
    });

    expect(markers).toHaveLength(2);
    expect(markers[1]?.kind).toBe('dropoff');
  });

  it('берёт точку B из polyline, если координаты dropoff невалидны', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: Number.NaN, lng: 44.8133, address: 'B' },
      routePolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    });

    expect(markers.some((marker) => marker.kind === 'dropoff')).toBe(true);
  });

  it('добавляет маркер водителя, если передана позиция', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
      driver: { lat: 43.22, lng: 44.77 },
    });

    expect(markers.some((marker) => marker.kind === 'driver')).toBe(true);
  });

  it('разводит маркеры, если A и B слишком близко', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.2167, lng: 44.7667, address: 'B' },
    });

    const dropoff = markers.find((marker) => marker.kind === 'dropoff');
    expect(dropoff?.point.lat).not.toBe(43.2167);
  });
});
