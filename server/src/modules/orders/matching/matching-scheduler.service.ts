import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../messaging/event-bus.service';
import { OrdersService } from '../orders.service';

const REMATCH_INTERVAL_MS = 5_000;

/**
 * Пока заказ в поиске, подбор повторяется: водитель мог выйти на линию уже после создания.
 * Тик страхует пропущенное событие `driver.available` (геопозиция пришла без смены статуса).
 */
@Injectable()
export class MatchingScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchingScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly orders: OrdersService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    // `notify` — водитель только что стал свободен: ему нужно повторно отдать уже
    // созданное предложение, если событие `order.offer` он ещё не слушал.
    this.eventBus.subscribeLocal(
      'driver.available',
      (payload: { driverId?: string; notify?: boolean }) =>
        this.orders.rematchSearchingOrders(payload?.notify ? payload.driverId : undefined),
    );
    this.timer = setInterval(() => this.tick(), REMATCH_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private tick(): void {
    void this.orders.rematchSearchingOrders().catch((error) => {
      this.logger.warn(
        `Повторный подбор не выполнился: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }
}
