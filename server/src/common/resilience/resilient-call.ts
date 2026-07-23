import type { CircuitBreakerService } from './circuit-breaker.service';

export interface ResilientCallOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  circuitKey?: string;
  circuitBreaker?: CircuitBreakerService;
  onAttempt?: (durationMs: number, success: boolean) => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Обёртка внешних вызовов: таймаут, retry с задержкой, circuit breaker (Des §11).
 */
export async function resilientCall<T>(
  fn: () => Promise<T>,
  options: ResilientCallOptions = {},
): Promise<T> {
  const {
    timeoutMs = 5000,
    retries = 2,
    retryDelayMs = 200,
    circuitKey,
    circuitBreaker,
    onAttempt,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (circuitKey && circuitBreaker) {
      circuitBreaker.assertClosed(circuitKey);
    }

    const started = Date.now();
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs),
        ),
      ]);
      if (circuitKey && circuitBreaker) circuitBreaker.recordSuccess(circuitKey);
      onAttempt?.(Date.now() - started, true);
      return result;
    } catch (error) {
      lastError = error;
      if (circuitKey && circuitBreaker) circuitBreaker.recordFailure(circuitKey);
      onAttempt?.(Date.now() - started, false);
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
