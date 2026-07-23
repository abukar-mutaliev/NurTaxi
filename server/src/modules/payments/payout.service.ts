import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriversService } from '../drivers/drivers.service';
import { PayoutStatus } from './enums/payment.enums';
import { Payout } from './entities/payout.entity';
import { LedgerService } from './ledger.service';
import { OutboxService } from './outbox.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider.interface';
import { roundMoney } from './payments.util';

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(Payout)
    private readonly payouts: Repository<Payout>,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly ledger: LedgerService,
    private readonly outbox: OutboxService,
    private readonly driversService: DriversService,
  ) {}

  async requestPayout(
    driverUserId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<Payout> {
    if (amount <= 0) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: 'Сумма вывода должна быть больше нуля',
      });
    }

    const existing = await this.payouts.findOne({ where: { idempotencyKey } });
    if (existing) {
      return existing;
    }

    const profile = await this.driversService.getProfileByUserId(driverUserId);
    const balance = await this.ledger.getDriverBalance(profile.id);

    if (roundMoney(amount) > roundMoney(balance)) {
      throw new ConflictException({
        code: 'INSUFFICIENT_BALANCE',
        message: 'Недостаточно средств для вывода',
        details: { balance: roundMoney(balance) },
      });
    }

    const payout = await this.payouts.save(
      this.payouts.create({
        driverId: profile.id,
        amount: String(roundMoney(amount)),
        currency: profile.region?.currency ?? 'RUB',
        status: PayoutStatus.Processing,
        idempotencyKey,
        requestedAt: new Date(),
      }),
    );

    const result = await this.provider.payout({
      amount: roundMoney(amount),
      currency: payout.currency,
      driverId: profile.id,
      idempotencyKey,
    });

    if (result.status === 'failed') {
      payout.status = PayoutStatus.Failed;
      payout.failureReason = result.failureReason ?? 'PAYOUT_FAILED';
      payout.processedAt = new Date();
      await this.payouts.save(payout);
      throw new ConflictException({
        code: 'PAYOUT_FAILED',
        message: 'Не удалось выполнить вывод средств',
      });
    }

    payout.status = PayoutStatus.Completed;
    payout.externalPayoutId = result.payoutId;
    payout.processedAt = new Date();
    await this.payouts.save(payout);

    await this.ledger.recordPayout({
      payoutId: payout.id,
      driverId: profile.id,
      regionId: profile.regionId,
      currency: payout.currency,
      amount: roundMoney(amount),
    });

    await this.outbox.enqueue('payment.payout_completed', {
      payoutId: payout.id,
      driverId: profile.id,
      amount: roundMoney(amount),
      currency: payout.currency,
    });

    return payout;
  }

  async listDriverPayouts(driverUserId: string, limit = 20): Promise<Payout[]> {
    const profile = await this.driversService.getProfileByUserId(driverUserId);
    return this.payouts.find({
      where: { driverId: profile.id },
      order: { requestedAt: 'DESC' },
      take: limit,
    });
  }
}
