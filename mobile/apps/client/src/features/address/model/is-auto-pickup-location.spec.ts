import { decidePickupFromCamera } from './is-auto-pickup-location';

const myLocationLabel = 'Моё местоположение';
const gps = { lat: 43.2, lng: 44.7, address: myLocationLabel };

describe('decidePickupFromCamera', () => {
  it('не отрывает подачу от GPS, если карту едва сдвинули', () => {
    const decision = decidePickupFromCamera({
      current: gps,
      finished: true,
      mapPointAddress: 'Точка на карте',
      myLocationLabel,
      next: { lat: 43.20002, lng: 44.7 },
    });

    expect(decision).toEqual({ followGps: true, pickup: null });
  });

  it('ставит точку подачи туда, куда сдвинули карту', () => {
    const decision = decidePickupFromCamera({
      current: gps,
      finished: true,
      mapPointAddress: 'Точка на карте',
      myLocationLabel,
      next: { lat: 43.201, lng: 44.7 },
    });

    expect(decision.followGps).toBe(false);
    expect(decision.pickup).toEqual({
      address: 'Точка на карте',
      lat: 43.201,
      lng: 44.7,
    });
  });

  it('пока жест не закончился, не даёт GPS перехватить кадр', () => {
    const decision = decidePickupFromCamera({
      current: gps,
      finished: false,
      mapPointAddress: 'Точка на карте',
      myLocationLabel,
      next: { lat: 43.201, lng: 44.7 },
    });

    expect(decision).toEqual({ followGps: false, pickup: null });
  });

  it('уже выбранную вручную точку сдвигает и на несколько метров', () => {
    const decision = decidePickupFromCamera({
      current: { lat: 43.2, lng: 44.7, address: 'Назрань, улица Богатырёва, 23' },
      finished: true,
      mapPointAddress: 'Точка на карте',
      myLocationLabel,
      next: { lat: 43.20005, lng: 44.7 },
    });

    expect(decision.followGps).toBe(false);
    expect(decision.pickup?.lat).toBe(43.20005);
  });
});
