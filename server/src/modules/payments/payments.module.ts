import { Module } from '@nestjs/common';

/**
 * Payments & Ledger (Des §2.3, §8): оплата через адаптер PaymentProvider,
 * двойная запись (ledger), идемпотентность и outbox, комиссии, выплаты, чеки.
 * Реализация — Фаза 6 (Req §22, §9 п.4).
 */
@Module({})
export class PaymentsModule {}
