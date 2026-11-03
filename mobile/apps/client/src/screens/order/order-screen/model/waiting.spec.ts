import { describeWaiting, formatTripTotal } from '@nurtaxi/shared-core/entities/order';

describe('describeWaiting', () => {
  const startedAt = '2026-11-03T09:00:00.000Z';
  const start = Date.parse(startedAt);
  const waiting = { startedAt, freeSeconds: 300, pricePerMinute: 15 };

  it('считает остаток бесплатных 5 минут', () => {
    expect(describeWaiting(waiting, start + 60_000)).toMatchObject({
      phase: 'free',
      clockSeconds: 240,
      amount: 0,
    });
    expect(describeWaiting(waiting, start + 300_000)).toMatchObject({
      phase: 'free',
      clockSeconds: 0,
      amount: 0,
    });
  });

  it('после 5 минут берёт 15 ₽ за каждую начатую минуту', () => {
    expect(describeWaiting(waiting, start + 300_001)).toMatchObject({
      phase: 'paid',
      amount: 15,
      paidMinutes: 1,
    });
    expect(describeWaiting(waiting, start + 360_000)).toMatchObject({
      phase: 'paid',
      amount: 15,
      paidMinutes: 1,
    });
    expect(describeWaiting(waiting, start + 360_001)).toMatchObject({
      phase: 'paid',
      amount: 30,
      paidMinutes: 2,
    });
  });
});

describe('formatTripTotal', () => {
  it('добавляет ожидание к оценке, пока итог не зафиксирован', () => {
    const label = formatTripTotal({
      priceEstimated: 260,
      priceFinal: null,
      waiting: { amount: 15 },
    });
    expect(label.replace(/\s/gu, ' ')).toBe('275 ₽');
  });

  it('не округляет зафиксированный итог с ожиданием до десятков', () => {
    const label = formatTripTotal({
      priceEstimated: 260,
      priceFinal: 275,
      waiting: { amount: 15 },
    });
    expect(label.replace(/\s/gu, ' ')).toBe('275 ₽');
  });

  it('без ожидания оставляет округление цены поездки', () => {
    const label = formatTripTotal({
      priceEstimated: 264,
      priceFinal: null,
      waiting: null,
    });
    expect(label.replace(/\s/gu, ' ')).toBe('260 ₽');
  });
});
