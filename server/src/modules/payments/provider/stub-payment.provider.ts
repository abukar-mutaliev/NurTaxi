import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PayoutRequest,
  PayoutResult,
  RefundRequest,
  RefundResult,
} from './payment-provider.interface';

/**
 * Заглушка PSP для dev/staging (Des §4.3).
 * Сумма, оканчивающаяся на .99, имитирует отказ для тестирования retry.
 */
@Injectable()
export class StubPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(StubPaymentProvider.name);

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.logger.log(
      `[STUB] charge order=${request.orderId} amount=${request.amount} ${request.currency} key=${request.idempotencyKey}`,
    );

    const cents = Math.round(request.amount * 100) % 100;
    if (cents === 99) {
      return {
        transactionId: '',
        status: 'failed',
        failureReason: 'STUB_DECLINED',
      };
    }

    return {
      transactionId: `stub-ch-${randomUUID()}`,
      status: 'succeeded',
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(`[STUB] refund tx=${request.transactionId} amount=${request.amount}`);
    return { refundId: `stub-rf-${randomUUID()}`, status: 'succeeded' };
  }

  async payout(request: PayoutRequest): Promise<PayoutResult> {
    this.logger.log(
      `[STUB] payout driver=${request.driverId} amount=${request.amount} key=${request.idempotencyKey}`,
    );
    return { payoutId: `stub-po-${randomUUID()}`, status: 'succeeded' };
  }
}
