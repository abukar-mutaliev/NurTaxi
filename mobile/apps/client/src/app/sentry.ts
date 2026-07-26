/**
 * Инициализация Sentry (M0.9, `design.md §13`).
 *
 * Требование `§20`: персональные данные не должны утекать в трейсы. Поэтому `sendDefaultPii`
 * выключен, а телефон и адреса вычищаются из событий перед отправкой.
 */
import * as Sentry from '@sentry/react-native';

import { appConfig, isProdEnvironment } from '@nurtaxi/shared-core/shared/config';

const PII_KEYS = [
  'phone',
  'pendingPhone',
  'address',
  'pickupAddress',
  'dropoffAddress',
  'lat',
  'lng',
];

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        PII_KEYS.includes(key) ? '[redacted]' : scrub(item),
      ]),
    );
  }
  return value;
}

export function initSentry(): void {
  if (!appConfig.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: appConfig.sentryDsn,
    environment: appConfig.environment,
    sendDefaultPii: false,
    // В production выборочная трассировка, в остальных окружениях — полная.
    tracesSampleRate: isProdEnvironment ? 0.2 : 1.0,
    beforeSend(event) {
      if (event.extra) {
        event.extra = scrub(event.extra) as Record<string, unknown>;
      }
      if (event.contexts) {
        event.contexts = scrub(event.contexts) as typeof event.contexts;
      }
      delete event.user;
      return event;
    },
  });
}

export { Sentry };
