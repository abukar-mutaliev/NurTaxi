import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { PaymentsService } from './payments.service';

const OUTBOX_INTERVAL_MS = 5_000;
const RETRY_INTERVAL_MS = 30_000;

@Injectable()
export class OutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessor.name);
  private outboxTimer?: NodeJS.Timeout;
  private retryTimer?: NodeJS.Timeout;

  constructor(
    private readonly outbox: OutboxService,
    private readonly payments: PaymentsService,
  ) {}

  onModuleInit(): void {
    this.outboxTimer = setInterval(() => {
      void this.outbox.publishPending().catch((err) => {
        this.logger.warn(`Outbox tick failed: ${err instanceof Error ? err.message : err}`);
      });
    }, OUTBOX_INTERVAL_MS);

    this.retryTimer = setInterval(() => {
      void this.payments.processDueRetries().catch((err) => {
        this.logger.warn(`Payment retry tick failed: ${err instanceof Error ? err.message : err}`);
      });
    }, RETRY_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.outboxTimer) {
      clearInterval(this.outboxTimer);
    }
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }
}
