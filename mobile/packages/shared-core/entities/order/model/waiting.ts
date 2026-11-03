/**
 * Тот же расчёт, что `server/src/modules/orders/waiting.ts`:
 * 5 минут бесплатно, дальше 15 ₽ за каждую начатую минуту.
 * Деньги поездки списывает сервер; здесь только живые часы на экране.
 */
import { formatMoney, formatPrice } from '@nurtaxi/shared-core/shared/lib/format/units';

export const FREE_WAITING_SECONDS = 5 * 60;
export const WAITING_PRICE_PER_MINUTE = 15;

export interface WaitingClock {
  phase: 'free' | 'paid';
  /** Остаток бесплатного окна или секунды платного ожидания. */
  clockSeconds: number;
  paidMinutes: number;
  amount: number;
  pricePerMinute: number;
}

export function describeWaiting(
  waiting: { startedAt: string; freeSeconds: number; pricePerMinute: number },
  nowMs: number,
): WaitingClock {
  const started = Date.parse(waiting.startedAt);
  const elapsedMs = Number.isNaN(started) ? 0 : Math.max(0, nowMs - started);
  const freeMs = waiting.freeSeconds * 1000;

  if (elapsedMs <= freeMs) {
    return {
      phase: 'free',
      clockSeconds: Math.ceil((freeMs - elapsedMs) / 1000),
      paidMinutes: 0,
      amount: 0,
      pricePerMinute: waiting.pricePerMinute,
    };
  }

  const paidMs = elapsedMs - freeMs;
  const paidMinutes = Math.ceil(paidMs / 60_000);
  return {
    phase: 'paid',
    clockSeconds: Math.max(1, Math.ceil(paidMs / 1000)),
    paidMinutes,
    amount: paidMinutes * waiting.pricePerMinute,
    pricePerMinute: waiting.pricePerMinute,
  };
}

/** Итог к оплате: оценка маршрута плюс ожидание, пока сервер не зафиксировал `priceFinal`. */
export function formatTripTotal(order: {
  priceEstimated: number;
  priceFinal: number | null;
  waiting?: { amount: number } | null;
}): string {
  const waitingAmount = order.waiting?.amount ?? 0;
  const charge = order.priceFinal ?? order.priceEstimated + waitingAmount;
  return waitingAmount > 0 ? formatMoney(charge) : formatPrice(charge);
}
