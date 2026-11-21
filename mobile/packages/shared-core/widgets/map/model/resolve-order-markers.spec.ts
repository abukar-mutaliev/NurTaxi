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
    expect(markers[1]?.id).toBe('stop-43.19000,44.79000');
  });

  it('держит id остановки на её координатах, а не на порядковом номере', () => {
    const second = { lat: 43.2, lng: 44.8, address: 'Вторая' };
    const withBoth = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      stops: [{ lat: 43.19, lng: 44.79, address: 'Первая' }, second],
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
    });
    const withoutFirst = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      stops: [second],
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
    });

    expect(withoutFirst.find((marker) => marker.kind === 'stop')?.id).toBe(
      withBoth.find((marker) => marker.title === 'Вторая')?.id,
    );
  });

  it('добавляет маркер водителя, если передана позиция', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
      driver: { lat: 43.22, lng: 44.77 },
    });

    expect(markers.some((marker) => marker.kind === 'driver')).toBe(true);
  });

  it('передаёт курс назначенной машине и не выдумывает его остальным', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
      driver: { lat: 43.22, lng: 44.77 },
      driverHeading: 135,
      nearbyDrivers: [{ id: 'free-1', lat: 43.23, lng: 44.78 }],
    });

    expect(markers.find((marker) => marker.id === 'driver')?.heading).toBe(135);
    expect(markers.find((marker) => marker.id === 'nearby-free-1')?.heading).toBeUndefined();
  });

  it('без курса оставляет направление машины движению по карте', () => {
    const markers = resolveOrderMapMarkers({
      pickup: { lat: 43.2167, lng: 44.7667, address: 'A' },
      dropoff: { lat: 43.1687, lng: 44.8133, address: 'B' },
      driver: { lat: 43.22, lng: 44.77 },
      driverHeading: null,
    });

    expect(markers.find((marker) => marker.id === 'driver')).not.toHaveProperty('heading');
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
