import { glideDurationMs } from './use-gliding-point';

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
