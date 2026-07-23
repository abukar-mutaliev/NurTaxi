import { CircuitBreakerService } from './circuit-breaker.service';
import { resilientCall } from './resilient-call';

describe('resilientCall', () => {
  it('returns result on success', async () => {
    const result = await resilientCall(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('retries and eventually succeeds', async () => {
    let attempts = 0;
    const result = await resilientCall(
      () => {
        attempts += 1;
        if (attempts < 2) return Promise.reject(new Error('fail'));
        return Promise.resolve('ok');
      },
      { retries: 2, retryDelayMs: 1 },
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('opens circuit after repeated failures', async () => {
    const breaker = new CircuitBreakerService();
    const failing = () => Promise.reject(new Error('down'));

    for (let i = 0; i < 5; i += 1) {
      await expect(
        resilientCall(failing, { circuitKey: 'test', circuitBreaker: breaker, retries: 0 }),
      ).rejects.toThrow();
    }

    expect(breaker.isOpen('test')).toBe(true);
    await expect(
      resilientCall(failing, { circuitKey: 'test', circuitBreaker: breaker, retries: 0 }),
    ).rejects.toThrow(/Circuit open/);
  });
});
