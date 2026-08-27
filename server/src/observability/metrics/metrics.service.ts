import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

/**
 * Реестр метрик Prometheus (Des §13, Req §10.1, §21).
 * HTTP-метрики + доменные KPI: назначение водителя, заказы, платежи, внешние вызовы.
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

  readonly driverAssignmentDuration = new Histogram({
    name: 'order_driver_assignment_duration_seconds',
    help: 'Время от searching_driver до driver_assigned (KPI §10.1)',
    labelNames: ['region_id'] as const,
    buckets: [1, 5, 10, 15, 20, 30, 45, 60, 120],
    registers: [this.registry],
  });

  readonly ordersTotal = new Counter({
    name: 'orders_total',
    help: 'Счётчик заказов по итоговому статусу',
    labelNames: ['status', 'region_id'] as const,
    registers: [this.registry],
  });

  readonly paymentsTotal = new Counter({
    name: 'payments_total',
    help: 'Счётчик платежей по результату',
    labelNames: ['status', 'region_id'] as const,
    registers: [this.registry],
  });

  readonly externalCallDuration = new Histogram({
    name: 'external_call_duration_seconds',
    help: 'Длительность вызовов внешних провайдеров',
    labelNames: ['provider', 'operation', 'success'] as const,
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
    registers: [this.registry],
  });

  readonly externalCallFailures = new Counter({
    name: 'external_call_failures_total',
    help: 'Ошибки внешних провайдеров (circuit breaker / timeout)',
    labelNames: ['provider', 'operation'] as const,
    registers: [this.registry],
  });

  readonly serviceReady = new Gauge({
    name: 'service_ready',
    help: '1 — readiness probe успешен, 0 — нет (SLI доступности)',
    registers: [this.registry],
  });

  readonly risOutboxDepth = new Gauge({
    name: 'ris_outbox_pending',
    help: 'Размер очереди неотправленных событий в региональную ИС (FZ-07.7)',
    registers: [this.registry],
  });

  readonly risDeliveryDuration = new Histogram({
    name: 'ris_delivery_delay_seconds',
    help: 'Задержка доставки события в региональную ИС',
    buckets: [1, 5, 15, 30, 60, 120, 300, 900],
    registers: [this.registry],
  });

  readonly orderCompletenessViolations = new Counter({
    name: 'order_completeness_violations_total',
    help: 'Заказы в терминальном статусе без полного обязательного набора сведений (FZ-04.9)',
    labelNames: ['region_id'] as const,
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: process.env.OTEL_SERVICE_NAME ?? 'nurtaxi-backend' });
    collectDefaultMetrics({ register: this.registry });
    this.serviceReady.set(1);
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

  observeDriverAssignment(regionId: string, durationSeconds: number): void {
    this.driverAssignmentDuration.observe({ region_id: regionId }, durationSeconds);
  }

  incOrder(status: string, regionId: string): void {
    this.ordersTotal.inc({ status, region_id: regionId });
  }

  incPayment(status: 'succeeded' | 'failed' | 'escalated', regionId: string): void {
    this.paymentsTotal.inc({ status, region_id: regionId });
  }

  observeExternalCall(
    provider: string,
    operation: string,
    durationMs: number,
    success: boolean,
  ): void {
    const successLabel = success ? 'true' : 'false';
    this.externalCallDuration.observe(
      { provider, operation, success: successLabel },
      durationMs / 1000,
    );
    if (!success) {
      this.externalCallFailures.inc({ provider, operation });
    }
  }

  setReady(ready: boolean): void {
    this.serviceReady.set(ready ? 1 : 0);
  }

  setRisOutboxDepth(depth: number): void {
    this.risOutboxDepth.set(depth);
  }

  observeRisDelivery(delaySeconds: number): void {
    this.risDeliveryDuration.observe(delaySeconds);
  }

  incCompletenessViolation(regionId: string): void {
    this.orderCompletenessViolations.inc({ region_id: regionId });
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
