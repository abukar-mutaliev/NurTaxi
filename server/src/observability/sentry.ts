import * as Sentry from '@sentry/node';

/**
 * Инициализация Sentry для отслеживания ошибок приложения (Des §13).
 * Активна только при заданном SENTRY_DSN.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version ?? '0.1.0',
    tracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  });
}

export { Sentry };
