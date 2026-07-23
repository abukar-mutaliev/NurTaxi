import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBusService } from '../../messaging/event-bus.service';
import { OutboxStatus } from './enums/payment.enums';
import { OutboxEvent } from './entities/outbox-event.entity';

/**
 * Outbox pattern (Des §8.1): события сначала в БД, затем доставка в NATS.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outbox: Repository<OutboxEvent>,
    private readonly eventBus: EventBusService,
  ) {}

  async enqueue(eventType: string, payload: Record<string, unknown>): Promise<OutboxEvent> {
    return this.outbox.save(
      this.outbox.create({
        eventType,
        payload,
        status: OutboxStatus.Pending,
      }),
    );
  }

  async publishPending(limit = 50): Promise<number> {
    const pending = await this.outbox.find({
      where: { status: OutboxStatus.Pending },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    let published = 0;
    for (const event of pending) {
      try {
        this.eventBus.publish(event.eventType, event.payload);
        event.status = OutboxStatus.Published;
        event.publishedAt = new Date();
        event.attempts += 1;
        await this.outbox.save(event);
        published += 1;
      } catch (error) {
        event.attempts += 1;
        event.lastError = error instanceof Error ? error.message : String(error);
        if (event.attempts >= 5) {
          event.status = OutboxStatus.Failed;
        }
        await this.outbox.save(event);
        this.logger.warn(`Outbox publish failed: ${event.eventType} id=${event.id}`);
      }
    }

    return published;
  }
}
