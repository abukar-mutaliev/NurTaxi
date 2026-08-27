import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { trace } from '@opentelemetry/api';
import type { Params } from 'nestjs-pino';
import { LOGGER_REDACT_PATHS } from '../common/compliance/pii-scrubber';

type HttpRequest = IncomingMessage & { id?: string };

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
      // Компактные сериализаторы: без headers/query/params — они раздувают каждую строку лога.
      wrapSerializers: false,
      serializers: {
        req: (req: HttpRequest) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.socket?.remoteAddress,
        }),
        res: (res: ServerResponse) => ({
          statusCode: res.statusCode,
        }),
      },
      customSuccessMessage: (req: HttpRequest, res: ServerResponse) => {
        const url = req.url ?? '';
        return `${req.method} ${url} ${res.statusCode}`;
      },
      // Маскирование чувствительных полей (ПДн, секреты, токены) в прикладных логах.
      redact: {
        paths: LOGGER_REDACT_PATHS,
        censor: '[REDACTED]',
      },
      customProps: (req: IncomingMessage) => {
        const span = trace.getActiveSpan();
        const traceId = span?.spanContext().traceId;
        return {
          service: process.env.OTEL_SERVICE_NAME ?? 'nurtaxi-backend',
          trace_id: traceId ?? (req.headers['x-request-id'] as string | undefined),
        };
      },
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
