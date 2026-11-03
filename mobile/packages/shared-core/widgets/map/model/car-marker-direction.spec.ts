import { carMarkerDirection, shortestRotationTarget } from './car-marker-direction';

describe('carMarkerDirection', () => {
  it('сдвигает азимут GPS под горизонтальную иконку', () => {
    expect(carMarkerDirection(0)).toBe(-90);
    expect(carMarkerDirection(90)).toBe(0);
    expect(carMarkerDirection(180)).toBe(90);
  });
});

describe('shortestRotationTarget', () => {
  it('выбирает короткую дугу через 0°', () => {
    expect(shortestRotationTarget(350, 10)).toBe(370);
    expect(shortestRotationTarget(10, 350)).toBe(-10);
  });

  it('не крутит лишний оборот, если угол уже близок', () => {
    expect(shortestRotationTarget(40, 50)).toBe(50);
    expect(shortestRotationTarget(50, 40)).toBe(40);
  });
});
