import * as Sentry from '@sentry/node';
import { scrubSentryEvent } from '../common/compliance/pii-scrubber';

/**
 * Инициализация Sentry (Des §13, FZ-02.1, FZ-02.2).
 * В продуктиве включается только при SENTRY_ENABLED=true — сборщик должен быть в РФ.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const enabled = process.env.SENTRY_ENABLED?.toLowerCase() === 'true';
  if (!dsn || !enabled) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version ?? '0.1.0',
    tracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    beforeSend(event) {
      return scrubSentryEvent(
        event as unknown as Record<string, unknown>,
      ) as unknown as typeof event;
    },
  });
}

export { Sentry };
