import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MIN_ORDER_RETENTION_MONTHS } from '../../common/compliance/compliance-config';
import { AppSetting, RetentionPurgeRun } from './entities/retention.entity';

@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(AppSetting) private readonly settings: Repository<AppSetting>,
    @InjectRepository(RetentionPurgeRun) private readonly runs: Repository<RetentionPurgeRun>,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.purgeExpired().catch((err) =>
        this.logger.warn(`Retention purge failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 24 * 60 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async getRetentionMonths(): Promise<number> {
    const row = await this.settings.findOne({ where: { key: 'order_retention_months' } });
    const months = Number((row?.value as { months?: number } | undefined)?.months);
    return Number.isFinite(months) && months >= MIN_ORDER_RETENTION_MONTHS
      ? months
      : MIN_ORDER_RETENTION_MONTHS;
  }

  async setRetentionMonths(months: number): Promise<number> {
    if (months < MIN_ORDER_RETENTION_MONTHS) {
      throw new Error(`Срок хранения не может быть меньше ${MIN_ORDER_RETENTION_MONTHS} месяцев`);
    }
    const existing = await this.settings.findOne({ where: { key: 'order_retention_months' } });
    if (existing) {
      existing.value = { months };
      await this.settings.save(existing);
    } else {
      await this.settings.save(this.settings.create({ key: 'order_retention_months', value: { months } }));
    }
    return months;
  }

  async purgeExpired(): Promise<RetentionPurgeRun> {
    const months = await this.getRetentionMonths();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    await this.runs.query(`SELECT set_config('nurtaxi.allow_journal_purge', 'on', true)`);

    const result = await this.runs.query(
      `
      WITH old_orders AS (
        SELECT id FROM orders
        WHERE COALESCE(trip_ended_at, updated_at) < $1
          AND status IN ('closed', 'cancelled_by_client', 'cancelled_by_driver', 'cancelled_system')
      ),
      scrub AS (
        UPDATE orders o SET
          pickup_address = '[REDACTED]',
          dropoff_address = '[REDACTED]',
          comment = NULL,
          assignment_snapshot = jsonb_set(
            COALESCE(assignment_snapshot, '{}'::jsonb),
            '{contacts}',
            '{"driverPhone":null,"clientPhone":null}'
          )
        FROM old_orders oo
        WHERE o.id = oo.id
        RETURNING o.id
      )
      SELECT COUNT(*)::int AS n FROM scrub
      `,
      [cutoff],
    );

    const touched = Number(result[0]?.n ?? 0);
    return this.runs.save(
      this.runs.create({
        retentionMonths: months,
        cutoffAt: cutoff,
        ordersTouched: touched,
        status: 'completed',
        notes: 'Обезличивание адресов и контактов; записи моложе срока не затронуты',
      }),
    );
  }
}
