import { bearingDegrees, carDirectionFor, glideDurationMs } from './use-gliding-point';

const A = { lat: 43.1, lng: 44.8 };
const B = { lat: 43.101, lng: 44.802 };

describe('glideDurationMs', () => {
  it('скользит за время между обновлениями в разумных пределах', () => {
    expect(glideDurationMs(A, B, 2000)).toBe(2000);
    expect(glideDurationMs(A, B, 50)).toBe(300);
    expect(glideDurationMs(A, B, 15_000)).toBe(3000);
  });

  it('первую точку и дальний скачок ставит сразу', () => {
    expect(glideDurationMs(A, B, null)).toBe(0);
    expect(glideDurationMs(A, { lat: 43.2, lng: 44.8 }, 2000)).toBe(0);
  });
});

describe('bearingDegrees', () => {
  it('считает азимут от севера по часовой стрелке', () => {
    expect(bearingDegrees(A, { lat: 43.11, lng: 44.8 })).toBeCloseTo(0, 0);
    expect(bearingDegrees(A, { lat: 43.1, lng: 44.81 })).toBeCloseTo(90, 0);
    expect(bearingDegrees(A, { lat: 43.09, lng: 44.8 })).toBeCloseTo(180, 0);
    expect(bearingDegrees(A, { lat: 43.1, lng: 44.79 })).toBeCloseTo(270, 0);
  });
});

describe('carDirectionFor', () => {
  it('кладёт горизонтальную иконку вдоль дороги', () => {
    // Восток — иконка как нарисована; север — поперёк неё.
    expect(carDirectionFor(0, 90)).toBe(0);
    expect(Math.abs(carDirectionFor(0, 0))).toBe(90);
  });

  it('поворачивает не больше чем на 90° — машина симметрична', () => {
    expect(carDirectionFor(0, 270)).toBe(0);
    expect(carDirectionFor(0, 180)).toBe(-90);
    const turned = carDirectionFor(170, 100);
    expect(Math.abs(turned - 170)).toBeLessThanOrEqual(90);
    expect((((turned - (100 - 90)) % 180) + 180) % 180).toBe(0);
  });
});
