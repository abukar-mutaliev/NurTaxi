/**
 * Ожидание пассажира после «Я на месте».
 *
 * Первые 5 минут бесплатны. Дальше каждая начатая минута стоит 15 ₽:
 * ровно 5:00 — 0 ₽, 5:00 и 1 мс — уже 15 ₽, 6:00 — 15 ₽, 6:00 и 1 мс — 30 ₽.
 * Счётчик останавливается, когда водитель начинает поездку.
 */
export const FREE_WAITING_SECONDS = 5 * 60;
export const WAITING_PRICE_PER_MINUTE = 15;

export interface WaitingQuote {
  /** Сколько бесплатных секунд ещё осталось. 0 — бесплатное окно закрыто. */
  freeSecondsLeft: number;
  paidMinutes: number;
  amount: number;
}

export interface WaitingView {
  startedAt: string;
  /** Момент начала поездки. Пока водитель ждёт — null, сумма пересчитывается. */
  endedAt: string | null;
  freeSeconds: number;
  pricePerMinute: number;
  paidMinutes: number;
  amount: number;
}

export function quoteWaiting(startedAt: Date, endedAt: Date): WaitingQuote {
  const elapsedMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const freeMs = FREE_WAITING_SECONDS * 1000;
  const freeSecondsLeft = Math.ceil(Math.max(0, freeMs - elapsedMs) / 1000);
  const paidMs = Math.max(0, elapsedMs - freeMs);
  const paidMinutes = paidMs === 0 ? 0 : Math.ceil(paidMs / 60_000);
  return {
    freeSecondsLeft,
    paidMinutes,
    amount: paidMinutes * WAITING_PRICE_PER_MINUTE,
  };
}

export function moneyAmount(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function toWaitingView(
  order: {
    driverArrivedAt: Date | null;
    tripStartedAt: Date | null;
    waitingFee: string | null;
  },
  now = new Date(),
): WaitingView | null {
  if (!order.driverArrivedAt) {
    return null;
  }

  const endedAt = order.tripStartedAt;
  const quote = quoteWaiting(order.driverArrivedAt, endedAt ?? now);
  const amount = order.waitingFee != null ? Number(order.waitingFee) : quote.amount;
  const paidMinutes =
    order.waitingFee != null ? Math.round(amount / WAITING_PRICE_PER_MINUTE) : quote.paidMinutes;

  return {
    startedAt: order.driverArrivedAt.toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
    freeSeconds: FREE_WAITING_SECONDS,
    pricePerMinute: WAITING_PRICE_PER_MINUTE,
    paidMinutes,
    amount,
  };
}
