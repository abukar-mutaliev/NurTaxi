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

  it('ставит остановки между A и B', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      stops: [{ lat: 43.19, lng: 44.79, address: 'Остановка' }],
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
    });

    expect(markers.map((marker) => marker.kind)).toEqual(['pickup', 'stop', 'dropoff']);
    expect(markers[1]?.title).toBe('Остановка');
  });

  it('добавляет маркер водителя, если передана позиция', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
      driver: { lat: 43.22, lng: 44.77 },
    });

    expect(markers.some((marker) => marker.kind === 'driver')).toBe(true);
  });

  it('ставит свободных водителей отдельными машинками и не дублирует назначенного', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
      driver: { lat: 43.22, lng: 44.77 },
      assignedDriverId: 'assigned',
      nearbyDrivers: [
        { id: 'assigned', lat: 43.22, lng: 44.77 },
        { id: 'free-1', lat: 43.23, lng: 44.78 },
      ],
    });

    const cars = markers.filter((marker) => marker.kind === 'driver');
    expect(cars.map((marker) => marker.id)).toEqual(['driver', 'nearby-free-1']);
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
