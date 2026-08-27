import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { OutboxChannel } from '../../common/enums/compliance.enum';
import { OutboxStatus } from '../payments/enums/payment.enums';
import { resolveComplianceConfig } from '../../common/compliance/compliance-config';
import { IntegrationOutboxEvent } from '../../common/outbox/integration-outbox-event.entity';
import { RegionsService } from '../regions/regions.service';
import { RIS_CHANNEL, type RisChannel } from './ris-channel.interface';
import type { Order } from '../orders/entities/order.entity';
import { MetricsService } from '../../observability/metrics/metrics.service';
import { Optional } from '@nestjs/common';

@Injectable()
export class RisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RisService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(IntegrationOutboxEvent)
    private readonly outbox: Repository<IntegrationOutboxEvent>,
    @Inject(RIS_CHANNEL) private readonly channel: RisChannel,
    private readonly regions: RegionsService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.publishPending().catch((err) =>
        this.logger.warn(`RIS outbox tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 5_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueueTrip(order: Order): Promise<IntegrationOutboxEvent | null> {
    const region = await this.regions.getRegionOrThrow(order.regionId);
    const compliance = resolveComplianceConfig(region.complianceConfig);
    if (!compliance.risTransferEnabled) {
      return null;
    }

    const schema = compliance.risPayloadSchema;
    const payload =
      schema === 'minimal'
        ? { orderId: order.id, publicNumber: order.publicNumber, status: order.status }
        : {
            orderId: order.id,
            publicNumber: order.publicNumber,
            regionId: order.regionId,
            status: order.status,
            snapshot: order.assignmentSnapshot,
            tripStartedAt: order.tripStartedAt?.toISOString() ?? null,
            tripEndedAt: order.tripEndedAt?.toISOString() ?? null,
          };

    return this.outbox.save(
      this.outbox.create({
        channel: OutboxChannel.Ris,
        regionId: order.regionId,
        destination: 'regional-is',
        eventType: 'trip.completed',
        aggregateId: order.id,
        payload,
        status: OutboxStatus.Pending,
      }),
    );
  }

  async publishPending(limit = 50): Promise<number> {
    const pending = await this.outbox.find({
      where: { channel: OutboxChannel.Ris, status: OutboxStatus.Pending },
      order: { createdAt: 'ASC' },
      take: limit,
    });
    let published = 0;
    for (const event of pending) {
      if (event.nextAttemptAt && event.nextAttemptAt > new Date()) continue;
      try {
        const result = await this.channel.sendTrip({
          orderId: String(event.payload.orderId ?? event.aggregateId),
          publicNumber: String(event.payload.publicNumber ?? ''),
          regionId: event.regionId ?? '',
          status: String(event.payload.status ?? ''),
          snapshot: (event.payload.snapshot as Record<string, unknown> | null) ?? null,
          tripStartedAt: (event.payload.tripStartedAt as string | null) ?? null,
          tripEndedAt: (event.payload.tripEndedAt as string | null) ?? null,
        });
        event.status = OutboxStatus.Published;
        event.publishedAt = new Date();
        event.attempts += 1;
        event.response = result.response;
        await this.outbox.save(event);
        published += 1;
      } catch (error) {
        event.attempts += 1;
        event.lastError = error instanceof Error ? error.message : String(error);
        event.nextAttemptAt = new Date(Date.now() + Math.min(60_000 * event.attempts, 15 * 60_000));
        if (event.attempts >= 20) {
          event.status = OutboxStatus.Failed;
        }
        await this.outbox.save(event);
        this.logger.warn(`RIS deliver failed ${event.id}: ${event.lastError}`);
      }
    }
    return published;
  }

  async replayPeriod(from: Date, to: Date, regionId?: string): Promise<number> {
    const qb = this.outbox
      .createQueryBuilder('e')
      .where('e.channel = :channel', { channel: OutboxChannel.Ris })
      .andWhere('e.created_at >= :from', { from })
      .andWhere('e.created_at <= :to', { to });
    if (regionId) qb.andWhere('e.region_id = :regionId', { regionId });
    const rows = await qb.getMany();
    for (const row of rows) {
      row.status = OutboxStatus.Pending;
      row.nextAttemptAt = null;
      await this.outbox.save(row);
    }
    return rows.length;
  }

  queueDepth(): Promise<number> {
    return this.outbox.count({
      where: { channel: OutboxChannel.Ris, status: OutboxStatus.Pending },
    });
  }
}
