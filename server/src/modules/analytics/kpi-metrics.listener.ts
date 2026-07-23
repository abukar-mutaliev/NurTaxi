import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../messaging/event-bus.service';
import { MetricsService } from '../../observability/metrics/metrics.service';

/**
 * Подписка на доменные события для KPI-метрик (Req §10.1, §21).
 * Graceful degradation: ошибки метрик не влияют на бизнес-поток (Des §11).
 */
@Injectable()
export class KpiMetricsListener implements OnModuleInit {
  private readonly logger = new Logger(KpiMetricsListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribeLocal('payment.completed', (payload) =>
      this.safe(() => {
        const p = payload as { regionId?: string };
        this.metrics.incPayment('succeeded', p.regionId ?? 'unknown');
      }),
    );

    this.eventBus.subscribeLocal('payment.failed', (payload) =>
      this.safe(() => {
        const p = payload as { regionId?: string };
        this.metrics.incPayment('failed', p.regionId ?? 'unknown');
      }),
    );

    this.eventBus.subscribeLocal('payment.escalated', (payload) =>
      this.safe(() => {
        const p = payload as { regionId?: string };
        this.metrics.incPayment('escalated', p.regionId ?? 'unknown');
      }),
    );
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      this.logger.warn(`KPI metric skipped: ${error instanceof Error ? error.message : error}`);
    }
  }
}
