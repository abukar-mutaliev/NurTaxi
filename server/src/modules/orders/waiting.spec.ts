import { quoteWaiting, toWaitingView } from './waiting';

describe('quoteWaiting', () => {
  const start = new Date('2026-11-03T09:00:00.000Z');
  const at = (ms: number) => new Date(start.getTime() + ms);

  it('не берёт плату в первые 5 минут, включая ровную границу', () => {
    expect(quoteWaiting(start, at(0))).toMatchObject({ amount: 0, paidMinutes: 0 });
    expect(quoteWaiting(start, at(4 * 60_000 + 59_000))).toMatchObject({
      amount: 0,
      paidMinutes: 0,
      freeSecondsLeft: 1,
    });
    expect(quoteWaiting(start, at(5 * 60_000))).toMatchObject({
      amount: 0,
      paidMinutes: 0,
      freeSecondsLeft: 0,
    });
  });

  it('берёт 15 ₽ за каждую начатую минуту после бесплатного окна', () => {
    expect(quoteWaiting(start, at(5 * 60_000 + 1))).toMatchObject({ amount: 15, paidMinutes: 1 });
    expect(quoteWaiting(start, at(6 * 60_000))).toMatchObject({ amount: 15, paidMinutes: 1 });
    expect(quoteWaiting(start, at(6 * 60_000 + 1))).toMatchObject({ amount: 30, paidMinutes: 2 });
    expect(quoteWaiting(start, at(7 * 60_000 + 30_000))).toMatchObject({
      amount: 45,
      paidMinutes: 3,
    });
  });
});

describe('toWaitingView', () => {
  const arrived = new Date('2026-11-03T09:00:00.000Z');

  it('молчит, пока водитель не нажал «Я на месте»', () => {
    expect(
      toWaitingView({ driverArrivedAt: null, tripStartedAt: null, waitingFee: null }),
    ).toBeNull();
  });

  it('пока поездка не началась, считает сумму на текущий момент', () => {
    const view = toWaitingView(
      { driverArrivedAt: arrived, tripStartedAt: null, waitingFee: null },
      new Date(arrived.getTime() + 6 * 60_000),
    );
    expect(view).toMatchObject({
      endedAt: null,
      freeSeconds: 300,
      pricePerMinute: 15,
      amount: 15,
      paidMinutes: 1,
    });
  });

  it('после старта поездки отдаёт зафиксированную плату', () => {
    const started = new Date(arrived.getTime() + 8 * 60_000);
    const view = toWaitingView({
      driverArrivedAt: arrived,
      tripStartedAt: started,
      waitingFee: '45.00',
    });
    expect(view).toMatchObject({
      endedAt: started.toISOString(),
      amount: 45,
      paidMinutes: 3,
    });
  });
});
