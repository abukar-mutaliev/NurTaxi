import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus, TERMINAL_ORDER_STATUSES } from '../../common/enums/order-status.enum';
import { EventBusService } from '../../messaging/event-bus.service';
import { MetricsService } from '../../observability/metrics/metrics.service';
import { RealtimeBroadcastService } from '../realtime/realtime-broadcast.service';
import { Order } from './entities/order.entity';
import { OrderStatusLog } from './entities/order-status-log.entity';
import { assertTransitionAllowed } from './state/order-state-machine';
import { CompletenessStatus } from '../../common/enums/compliance.enum';
import { evaluateOrderCompleteness } from './order-completeness';
import { appendOrderStatusLog } from './append-order-status-log';
import { RisService } from '../ris/ris.service';

const CANCELLED: OrderStatus[] = [
  OrderStatus.CancelledByClient,
  OrderStatus.CancelledByDriver,
  OrderStatus.CancelledSystem,
];

export interface TransitionOptions {
  orderId: string;
  toStatus: OrderStatus;
  actorId?: string;
  reason?: string;
  mutate?: (order: Order) => void;
}

@Injectable()
export class OrderTransitionService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderStatusLog)
    private readonly logs: Repository<OrderStatusLog>,
    private readonly eventBus: EventBusService,
    @Optional() private readonly realtime?: RealtimeBroadcastService,
    @Optional() private readonly metrics?: MetricsService,
    @Optional() private readonly ris?: RisService,
  ) {}

  async transition(options: TransitionOptions): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: options.orderId },
      relations: ['driver', 'driver.user'],
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Заказ не найден' });
    }

    const fromStatus = order.status;
    assertTransitionAllowed(fromStatus, options.toStatus);

    order.status = options.toStatus;
    options.mutate?.(order);

    let saved: Order;
    try {
      saved = await this.orders.save(order);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException({
          code: 'ORDER_CONFLICT',
          message: 'Заказ был изменён другим процессом, повторите операцию',
        });
      }
      throw error;
    }

    await appendOrderStatusLog(this.logs, {
      orderId: saved.id,
      fromStatus,
      toStatus: options.toStatus,
      actorId: options.actorId ?? null,
      reason: options.reason ?? null,
    });

    this.eventBus.publish('order.status_changed', {
      orderId: saved.id,
      clientId: saved.clientId,
      fromStatus,
      toStatus: options.toStatus,
      actorId: options.actorId ?? null,
    });

    if (options.toStatus === OrderStatus.DriverAssigned) {
      this.eventBus.publish('order.driver_assigned', {
        orderId: saved.id,
        driverId: saved.driverId,
        clientId: saved.clientId,
      });
      void this.recordAssignmentDuration(saved.id, saved.regionId);
    }

    this.recordOrderOutcome(options.toStatus, saved.regionId);

    const isTerminal =
      TERMINAL_ORDER_STATUSES.includes(options.toStatus) ||
      options.toStatus === OrderStatus.Completed;
    if (isTerminal) {
      if (CANCELLED.includes(options.toStatus) && saved.tripStartedAt && !saved.tripEndedAt) {
        saved.tripEndedAt = new Date();
      }
      const completeness = evaluateOrderCompleteness(saved);
      saved.completenessStatus = completeness.status;
      await this.orders.save(saved);
      if (completeness.status === CompletenessStatus.Incomplete) {
        this.metrics?.incCompletenessViolation(saved.regionId);
      }
      if (options.toStatus === OrderStatus.Completed || options.toStatus === OrderStatus.Closed) {
        void this.ris?.enqueueTrip(saved);
      }
    }

    if (
      options.toStatus === OrderStatus.CancelledByClient ||
      options.toStatus === OrderStatus.CancelledByDriver ||
      options.toStatus === OrderStatus.CancelledSystem
    ) {
      this.eventBus.publish('order.cancelled', {
        orderId: saved.id,
        status: options.toStatus,
        reason: options.reason ?? null,
      });
    }

    await this.realtime?.publishOrderStatus(
      saved.id,
      saved.clientId,
      order.driver?.userId ?? null,
      saved.regionId,
      {
        orderId: saved.id,
        fromStatus,
        toStatus: options.toStatus,
        at: new Date().toISOString(),
      },
    );

    return saved;
  }

  private async recordAssignmentDuration(orderId: string, regionId: string): Promise<void> {
    if (!this.metrics) return;

    const searchingLog = await this.logs.findOne({
      where: { orderId, toStatus: OrderStatus.SearchingDriver },
      order: { createdAt: 'DESC' },
    });
    if (!searchingLog) return;

    const seconds = (Date.now() - searchingLog.createdAt.getTime()) / 1000;
    this.metrics.observeDriverAssignment(regionId, seconds);
  }

  private recordOrderOutcome(status: OrderStatus, regionId: string): void {
    if (!this.metrics) return;

    const terminal = [
      OrderStatus.Closed,
      OrderStatus.CancelledByClient,
      OrderStatus.CancelledByDriver,
      OrderStatus.CancelledSystem,
      OrderStatus.FailedPayment,
    ];
    if (terminal.includes(status)) {
      this.metrics.incOrder(status, regionId);
    }
  }
}
