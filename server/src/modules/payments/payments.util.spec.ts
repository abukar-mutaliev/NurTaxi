import { splitCommission, nextRetryDelayMs, roundMoney } from './payments.util';

describe('payments.util', () => {
  it('roundMoney округляет до 2 знаков', () => {
    expect(roundMoney(10.556)).toBe(10.56);
  });

  it('splitCommission делит сумму и комиссию', () => {
    const { commission, driverNet } = splitCommission(100, 15);
    expect(commission).toBe(15);
    expect(driverNet).toBe(85);
  });

  it('nextRetryDelayMs возвращает null после лимита', () => {
    expect(nextRetryDelayMs(0)).toBe(60_000);
    expect(nextRetryDelayMs(4)).toBeNull();
  });
});
