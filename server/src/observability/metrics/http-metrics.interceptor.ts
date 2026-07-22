import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Замеряет латентность и количество HTTP-запросов для Prometheus.
 * Использует маршрут (route path), а не конкретный URL, чтобы избежать
 * высокой кардинальности меток (id в пути схлопывается в шаблон).
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const route = req.route?.path ?? req.path ?? 'unknown';
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        this.metricsService.observeHttpRequest(req.method, route, res.statusCode, durationSeconds);
      }),
    );
  }
}
