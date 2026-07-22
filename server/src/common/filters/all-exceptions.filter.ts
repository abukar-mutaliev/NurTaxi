import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Sentry } from '../../observability/sentry';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Глобальный обработчик исключений. Приводит все ошибки к единому формату ответа
 * (`code`, `message`, `details`) согласно требованиям к API (Req §14.5) и
 * отправляет 5xx-ошибки в Sentry (Des §13).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      Sentry.captureException(exception);
    }

    response.status(status).json({
      error: body,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalize(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return { status, body: { code: this.codeFromStatus(status), message: res } };
      }

      const obj = res as Record<string, unknown>;
      return {
        status,
        body: {
          code: (obj.code as string) ?? this.codeFromStatus(status),
          message: Array.isArray(obj.message)
            ? (obj.message as string[]).join('; ')
            : ((obj.message as string) ?? exception.message),
          details: obj.details ?? (Array.isArray(obj.message) ? obj.message : undefined),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' },
    };
  }

  private codeFromStatus(status: number): string {
    return HttpStatus[status] ?? `HTTP_${status}`;
  }
}
