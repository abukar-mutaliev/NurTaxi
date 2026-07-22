import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

/**
 * Конфигурация структурированного (JSON) логирования через pino.
 *
 * Особенности под требования проекта:
 * - корреляция логов по trace_id / request id (Des §13, §21);
 * - маскирование персональных данных в логах (152-ФЗ, Req §20, Des §9).
 */
export function buildLoggerConfig(): Params {
  const pretty = process.env.LOG_PRETTY?.toLowerCase() === 'true';
  const level = process.env.LOG_LEVEL ?? 'info';

  return {
    pinoHttp: {
      level,
      // Корреляционный идентификатор запроса; при наличии заголовка трейса — переиспользуем.
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing =
          (req.headers['x-request-id'] as string) ?? (req.headers['x-correlation-id'] as string);
        const id = existing ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      // Маскирование чувствительных полей (ПДн, секреты, токены).
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.otp',
          'req.body.code',
          'req.body.phone',
          'req.body.token',
          'req.body.refreshToken',
          '*.password',
          '*.otp',
          '*.idempotencyKey',
          '*.credentials',
        ],
        censor: '[REDACTED]',
      },
      customProps: () => ({ service: process.env.OTEL_SERVICE_NAME ?? 'nurtaxi-backend' }),
      autoLogging: {
        ignore: (req: IncomingMessage) => {
          const url = req.url ?? '';
          // Не засоряем логи проверками здоровья и метриками.
          return url.startsWith('/metrics') || url.includes('/health');
        },
      },
      transport: pretty
        ? {
            target: 'pino-pretty',
            options: { singleLine: true, colorize: true, translateTime: 'SYS:standard' },
          }
        : undefined,
    },
  };
}
