import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../../messaging/messaging.module';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { DriversModule } from '../drivers/drivers.module';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Payment } from './entities/payment.entity';
import { Payout } from './entities/payout.entity';
import { Receipt } from './entities/receipt.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { PAYMENT_PROVIDER } from './provider/payment-provider.interface';
import { StubPaymentProvider } from './provider/stub-payment.provider';
import { LedgerService } from './ledger.service';
import { OutboxService } from './outbox.service';
import { OutboxProcessor } from './outbox.processor';
import { PaymentsService } from './payments.service';
import { PayoutService } from './payout.service';
import { PaymentsController } from './payments.controller';

/**
 * Payments & Ledger (Des §2.3, §8): оплата через адаптер PaymentProvider,
 * двойная запись (ledger), идемпотентность и outbox, комиссии, выплаты, чеки.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LedgerAccount,
      LedgerEntry,
      Payment,
      Payout,
      Receipt,
      OutboxEvent,
      Order,
    ]),
    MessagingModule,
    TariffsModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => DriversModule),
  ],
  controllers: [PaymentsController],
  providers: [
    LedgerService,
    OutboxService,
    OutboxProcessor,
    PaymentsService,
    PayoutService,
    StubPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: StubPaymentProvider },
  ],
  exports: [PaymentsService, LedgerService, PayoutService],
})
export class PaymentsModule {}
