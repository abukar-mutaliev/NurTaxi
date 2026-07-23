import { Injectable } from '@nestjs/common';

interface CircuitState {
  failures: number;
  openedAt: number | null;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_MS = 30_000;

/**
 * In-memory circuit breaker для внешних провайдеров (Des §11, Req §18).
 */
@Injectable()
export class CircuitBreakerService {
  private readonly states = new Map<string, CircuitState>();

  assertClosed(key: string): void {
    const state = this.getState(key);
    if (state.openedAt === null) return;

    if (Date.now() - state.openedAt >= DEFAULT_RESET_MS) {
      state.openedAt = null;
      state.failures = 0;
      return;
    }

    throw new Error(`Circuit open: ${key}`);
  }

  recordSuccess(key: string): void {
    const state = this.getState(key);
    state.failures = 0;
    state.openedAt = null;
  }

  recordFailure(key: string): void {
    const state = this.getState(key);
    state.failures += 1;
    if (state.failures >= DEFAULT_FAILURE_THRESHOLD) {
      state.openedAt = Date.now();
    }
  }

  isOpen(key: string): boolean {
    try {
      this.assertClosed(key);
      return false;
    } catch {
      return true;
    }
  }

  private getState(key: string): CircuitState {
    if (!this.states.has(key)) {
      this.states.set(key, { failures: 0, openedAt: null });
    }
    return this.states.get(key)!;
  }
}
