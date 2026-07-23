export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function splitCommission(
  gross: number,
  commissionPercent: number,
): { commission: number; driverNet: number } {
  const commission = roundMoney(gross * (commissionPercent / 100));
  const driverNet = roundMoney(gross - commission);
  return { commission, driverNet };
}

export const PAYMENT_RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000] as const;
export const MAX_PAYMENT_RETRIES = PAYMENT_RETRY_DELAYS_MS.length;

export function nextRetryDelayMs(retryCount: number): number | null {
  if (retryCount >= MAX_PAYMENT_RETRIES) {
    return null;
  }
  return PAYMENT_RETRY_DELAYS_MS[retryCount] ?? null;
}
