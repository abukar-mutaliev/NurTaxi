import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus, PaymentMethod } from '../../common/enums/order-status.enum';
import { Order } from '../orders/entities/order.entity';
import { OrderTransitionService } from '../orders/order-transition.service';
import { OrdersService } from '../orders/orders.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { PaymentStatus } from './enums/payment.enums';
import { Payment } from './entities/payment.entity';
import { Receipt } from './entities/receipt.entity';
import { LedgerService } from './ledger.service';
import { OutboxService } from './outbox.service';
import { EventBusService } from '../../messaging/event-bus.service';
import { CircuitBreakerService } from '../../common/resilience/circuit-breaker.service';
import { resilientCall } from '../../common/resilience/resilient-call';
import { MetricsService } from '../../observability/metrics/metrics.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider.interface';
import {
  MAX_PAYMENT_RETRIES,
  nextRetryDelayMs,
  roundMoney,
  splitCommission,
} from './payments.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Receipt)
    private readonly receipts: Repository<Receipt>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly ledger: LedgerService,
    private readonly outbox: OutboxService,
    private readonly eventBus: EventBusService,
    private readonly tariffsService: TariffsService,
    private readonly transitions: OrderTransitionService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly metrics: MetricsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Оплата после COMPLETED (Req §12, Des §8).
   * Идемпотентна по orderId.
   */
  async settleCompletedOrder(orderId: string, actorId?: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ['region', 'tariff'],
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Заказ не найден' });
    }

    if (order.status !== OrderStatus.Completed && order.status !== OrderStatus.FailedPayment) {
      throw new ConflictException({
        code: 'INVALID_ORDER_STATE',
        message: 'Оплата доступна только для завершённой поездки',
      });
    }

    const idempotencyKey = `charge:${orderId}`;
    let payment = await this.payments.findOne({ where: { idempotencyKey } });

    if (payment?.status === PaymentStatus.Succeeded) {
      const current = await this.orders.findOne({ where: { id: orderId } });
      if (current && current.status !== OrderStatus.Closed) {
        return this.ordersService.closeOrder(orderId, actorId);
      }
      return this.ordersService.getOrderOrThrow(orderId);
    }

    const gross = roundMoney(Number(order.priceFinal ?? order.priceEstimated));
    const tariff = await this.tariffsService.getEffectiveTariff(order.regionId, order.tariffId);
    const { commission, driverNet } = splitCommission(gross, Number(tariff.commissionPercent));

    if (!payment) {
      payment = await this.payments.save(
        this.payments.create({
          orderId,
          amount: String(gross),
          currency: order.region.currency,
          status: PaymentStatus.Pending,
          idempotencyKey,
          commissionAmount: String(commission),
          driverNetAmount: String(driverNet),
        }),
      );
    }

    if (order.paymentMethod === PaymentMethod.Cash) {
      return this.finalizeSuccessfulPayment(order, payment, actorId);
    }

    payment.status = PaymentStatus.Processing;
    await this.payments.save(payment);

    const chargeResult = await resilientCall(
      () =>
        this.provider.charge({
          amount: gross,
          currency: order.region.currency,
          orderId,
          idempotencyKey,
          description: `Nur Taxi order ${orderId}`,
        }),
      {
        timeoutMs: 10_000,
        retries: 1,
        circuitKey: 'payment',
        circuitBreaker: this.circuitBreaker,
        onAttempt: (durationMs, success) =>
          this.metrics.observeExternalCall('payment', 'charge', durationMs, success),
      },
    );

    if (chargeResult.status === 'succeeded') {
      payment.status = PaymentStatus.Succeeded;
      payment.externalTransactionId = chargeResult.transactionId;
      payment.failureReason = null;
      payment.nextRetryAt = null;
      await this.payments.save(payment);
      return this.finalizeSuccessfulPayment(order, payment, actorId);
    }

    return this.handleFailedCharge(order, payment, chargeResult.failureReason ?? 'CHARGE_FAILED');
  }

  async processDueRetries(): Promise<number> {
    const now = new Date();
    const due = await this.payments
      .createQueryBuilder('p')
      .innerJoin(Order, 'o', 'o.id = p.order_id')
      .where('p.status = :status', { status: PaymentStatus.Failed })
      .andWhere('p.next_retry_at IS NOT NULL')
      .andWhere('p.next_retry_at <= :now', { now })
      .andWhere('o.status = :orderStatus', { orderStatus: OrderStatus.FailedPayment })
      .take(20)
      .getMany();

    let processed = 0;
    for (const payment of due) {
      processed += 1;
      await this.retryPayment(payment.orderId);
    }
    return processed;
  }

  async retryPayment(orderId: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ['region'],
    });
    if (!order || order.status !== OrderStatus.FailedPayment) {
      throw new ConflictException({
        code: 'INVALID_ORDER_STATE',
        message: 'Retry доступен только для заказов со сбоем оплаты',
      });
    }

    await this.transitions.transition({
      orderId,
      toStatus: OrderStatus.Completed,
      reason: 'PAYMENT_RETRY',
    });

    return this.settleCompletedOrder(orderId);
  }

  async getReceiptForClient(clientId: string, orderId: string): Promise<Receipt> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Заказ не найден' });
    }
    if (order.clientId !== clientId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа к чеку' });
    }
    if (order.status !== OrderStatus.Closed) {
      throw new ConflictException({
        code: 'RECEIPT_NOT_READY',
        message: 'Чек доступен после закрытия заказа',
      });
    }

    const receipt = await this.receipts.findOne({ where: { orderId } });
    if (!receipt) {
      throw new NotFoundException({ code: 'RECEIPT_NOT_FOUND', message: 'Чек не найден' });
    }
    return receipt;
  }

  private async finalizeSuccessfulPayment(
    order: Order,
    payment: Payment,
    actorId?: string,
  ): Promise<Order> {
    if (!order.driverId) {
      throw new BadRequestException({
        code: 'NO_DRIVER',
        message: 'Невозможно провести оплату без водителя',
      });
    }

    const gross = roundMoney(Number(payment.amount));
    const commission = roundMoney(Number(payment.commissionAmount ?? 0));
    const driverNet = roundMoney(Number(payment.driverNetAmount ?? 0));

    await this.ledger.recordTripSettlement({
      paymentId: payment.id,
      regionId: order.regionId,
      currency: order.region?.currency ?? 'RUB',
      driverId: order.driverId,
      gross,
      commission,
      driverNet,
    });

    await this.ensureReceipt(order, payment, gross, commission, driverNet);

    const paymentPayload = {
      orderId: order.id,
      clientId: order.clientId,
      regionId: order.regionId,
      paymentId: payment.id,
      amount: gross,
      currency: payment.currency,
      method: order.paymentMethod,
    };
    await this.outbox.enqueue('payment.completed', paymentPayload);
    this.eventBus.publish('payment.completed', paymentPayload);

    return this.ordersService.closeOrder(order.id, actorId);
  }

  private async handleFailedCharge(
    order: Order,
    payment: Payment,
    failureReason: string,
  ): Promise<Order> {
    payment.status = PaymentStatus.Failed;
    payment.failureReason = failureReason;
    payment.retryCount += 1;

    const delay = nextRetryDelayMs(payment.retryCount - 1);
    if (delay !== null && payment.retryCount <= MAX_PAYMENT_RETRIES) {
      payment.nextRetryAt = new Date(Date.now() + delay);
    } else {
      payment.nextRetryAt = null;
      await this.outbox.enqueue('payment.escalated', {
        orderId: order.id,
        regionId: order.regionId,
        paymentId: payment.id,
        reason: failureReason,
        retryCount: payment.retryCount,
      });
      this.logger.warn(
        `Payment escalated to operator: order=${order.id} payment=${payment.id} retries=${payment.retryCount}`,
      );
    }

    await this.payments.save(payment);

    await this.transitions.transition({
      orderId: order.id,
      toStatus: OrderStatus.FailedPayment,
      reason: failureReason,
    });

    const failedPayload = {
      orderId: order.id,
      clientId: order.clientId,
      regionId: order.regionId,
      paymentId: payment.id,
      reason: failureReason,
      nextRetryAt: payment.nextRetryAt?.toISOString() ?? null,
    };
    await this.outbox.enqueue('payment.failed', failedPayload);
    this.eventBus.publish('payment.failed', failedPayload);

    return this.ordersService.getOrderOrThrow(order.id);
  }

  private async ensureReceipt(
    order: Order,
    payment: Payment,
    gross: number,
    commission: number,
    driverNet: number,
  ): Promise<Receipt> {
    const existing = await this.receipts.findOne({ where: { orderId: order.id } });
    if (existing) {
      return existing;
    }

    const receiptNumber = this.buildReceiptNumber(order.id);
    return this.receipts.save(
      this.receipts.create({
        orderId: order.id,
        paymentId: payment.id,
        receiptNumber,
        amount: String(gross),
        currency: payment.currency,
        issuedAt: new Date(),
        payload: {
          orderId: order.id,
          paymentMethod: order.paymentMethod,
          pickupAddress: order.pickupAddress,
          dropoffAddress: order.dropoffAddress,
          commission,
          driverNet,
          tariffName: order.tariff?.name,
        },
      }),
    );
  }

  private buildReceiptNumber(orderId: string): string {
    const date = new Date();
    const ymd =
      `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}` +
      `${String(date.getDate()).padStart(2, '0')}`;
    return `NT-${ymd}-${orderId.slice(0, 8).toUpperCase()}`;
  }

  /** Возврат/компенсация оператором (Req §7.3, §14.4). */
  async refundOrder(
    orderId: string,
    amount: number,
    idempotencyKey: string,
    reason?: string,
  ): Promise<Payment> {
    const existing = await this.payments.findOne({ where: { idempotencyKey } });
    if (existing) {
      return existing;
    }

    const payment = await this.payments.findOne({
      where: { orderId, status: PaymentStatus.Succeeded },
      order: { createdAt: 'DESC' },
    });

    if (!payment?.externalTransactionId) {
      throw new ConflictException({
        code: 'REFUND_NOT_AVAILABLE',
        message: 'Возврат доступен только для успешных карточных платежей',
      });
    }

    const refundAmount = roundMoney(amount);
    const result = await this.provider.refund({
      transactionId: payment.externalTransactionId,
      amount: refundAmount,
      currency: payment.currency,
      idempotencyKey,
    });

    if (result.status === 'failed') {
      throw new ConflictException({
        code: 'REFUND_FAILED',
        message: result.failureReason ?? 'Не удалось выполнить возврат',
      });
    }

    await this.outbox.enqueue('payment.refunded', {
      orderId,
      paymentId: payment.id,
      amount: refundAmount,
      reason: reason ?? null,
      refundId: result.refundId,
    });

    return payment;
  }
}
