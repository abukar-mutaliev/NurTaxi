import { Module } from '@nestjs/common';
import { MessagingModule } from '../../messaging/messaging.module';
import { KpiMetricsListener } from './kpi-metrics.listener';

/**
 * Analytics (Des §2.3, §13): KPI-метрики из доменных событий.
 * Некритичный модуль — сбой не блокирует заказ (Des §11, Req §18).
 */
@Module({
  imports: [MessagingModule],
  providers: [KpiMetricsListener],
})
export class AnalyticsModule {}
