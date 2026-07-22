import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

/**
 * Реестр метрик Prometheus (Des §13, Req §10.1).
 * Помимо системных метрик процесса собираем HTTP-латентность — база для
 * KPI-дашбордов (латентность API, доля успешных запросов).
 * Доменные метрики (время назначения водителя, доля успешных платежей) будут
 * добавляться соответствующими модулями на следующих фазах.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Длительность обработки HTTP-запросов в секундах',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Общее количество HTTP-запросов',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: process.env.OTEL_SERVICE_NAME ?? 'nurtaxi-backend' });
    collectDefaultMetrics({ register: this.registry });
  }

  observeHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestDuration.observe(labels, durationSeconds);
    this.httpRequestsTotal.inc(labels);
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
