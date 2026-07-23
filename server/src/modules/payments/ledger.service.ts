import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { LedgerAccountType, LedgerEntrySide } from './enums/payment.enums';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { roundMoney } from './payments.util';

export interface JournalLine {
  accountId: string;
  side: LedgerEntrySide;
  amount: number;
  idempotencyKey?: string;
}

export interface RecordJournalOptions {
  journalId?: string;
  refType: string;
  refId: string;
  description?: string;
  lines: JournalLine[];
}

/**
 * Двойная запись (Des §8.1): каждый journal сбалансирован (debit = credit).
 */
@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerAccount)
    private readonly accounts: Repository<LedgerAccount>,
    @InjectRepository(LedgerEntry)
    private readonly entries: Repository<LedgerEntry>,
  ) {}

  async getOrCreatePlatformAccount(regionId: string, currency: string): Promise<LedgerAccount> {
    let account = await this.accounts.findOne({
      where: { accountType: LedgerAccountType.Platform, regionId },
    });
    if (!account) {
      account = await this.accounts.save(
        this.accounts.create({
          accountType: LedgerAccountType.Platform,
          regionId,
          currency,
          ownerId: null,
          balance: '0',
        }),
      );
    }
    return account;
  }

  async getOrCreateDriverAccount(
    driverId: string,
    regionId: string,
    currency: string,
  ): Promise<LedgerAccount> {
    let account = await this.accounts.findOne({
      where: { accountType: LedgerAccountType.Driver, ownerId: driverId },
    });
    if (!account) {
      account = await this.accounts.save(
        this.accounts.create({
          accountType: LedgerAccountType.Driver,
          ownerId: driverId,
          regionId,
          currency,
          balance: '0',
        }),
      );
    }
    return account;
  }

  async getDriverBalance(driverId: string): Promise<number> {
    const account = await this.accounts.findOne({
      where: { accountType: LedgerAccountType.Driver, ownerId: driverId },
    });
    return account ? Number(account.balance) : 0;
  }

  async sumDriverCreditsSince(driverId: string, since: Date): Promise<number> {
    const account = await this.accounts.findOne({
      where: { accountType: LedgerAccountType.Driver, ownerId: driverId },
    });
    if (!account) {
      return 0;
    }

    const rows = await this.entries.find({
      where: {
        accountId: account.id,
        side: LedgerEntrySide.Credit,
        createdAt: Between(since, new Date()),
      },
    });

    return roundMoney(rows.reduce((sum, row) => sum + Number(row.amount), 0));
  }

  async recordJournal(options: RecordJournalOptions): Promise<LedgerEntry[]> {
    const journalId = options.journalId ?? randomUUID();

    const debitTotal = roundMoney(
      options.lines
        .filter((l) => l.side === LedgerEntrySide.Debit)
        .reduce((s, l) => s + l.amount, 0),
    );
    const creditTotal = roundMoney(
      options.lines
        .filter((l) => l.side === LedgerEntrySide.Credit)
        .reduce((s, l) => s + l.amount, 0),
    );

    if (debitTotal !== creditTotal) {
      throw new Error(
        `Ledger journal ${journalId} unbalanced: debit=${debitTotal} credit=${creditTotal}`,
      );
    }

    const saved: LedgerEntry[] = [];

    for (const line of options.lines) {
      if (line.idempotencyKey) {
        const existing = await this.entries.findOne({
          where: { idempotencyKey: line.idempotencyKey },
        });
        if (existing) {
          continue;
        }
      }

      const account = await this.accounts.findOneOrFail({ where: { id: line.accountId } });
      const delta = line.side === LedgerEntrySide.Credit ? line.amount : -line.amount;
      const balanceAfter = roundMoney(Number(account.balance) + delta);

      account.balance = String(balanceAfter);
      await this.accounts.save(account);

      const entry = await this.entries.save(
        this.entries.create({
          journalId,
          accountId: line.accountId,
          side: line.side,
          amount: String(roundMoney(line.amount)),
          balanceAfter: String(balanceAfter),
          refType: options.refType,
          refId: options.refId,
          idempotencyKey: line.idempotencyKey ?? null,
          description: options.description ?? null,
        }),
      );
      saved.push(entry);
    }

    return saved;
  }

  /**
   * Проводка по завершённой поездке: комиссия платформе, остаток водителю.
   */
  async recordTripSettlement(params: {
    paymentId: string;
    regionId: string;
    currency: string;
    driverId: string;
    gross: number;
    commission: number;
    driverNet: number;
  }): Promise<void> {
    const platform = await this.getOrCreatePlatformAccount(params.regionId, params.currency);
    const driver = await this.getOrCreateDriverAccount(
      params.driverId,
      params.regionId,
      params.currency,
    );

    await this.recordJournal({
      refType: 'payment',
      refId: params.paymentId,
      description: 'Trip settlement',
      lines: [
        {
          accountId: platform.id,
          side: LedgerEntrySide.Debit,
          amount: params.gross,
          idempotencyKey: `trip:${params.paymentId}:platform-debit`,
        },
        {
          accountId: driver.id,
          side: LedgerEntrySide.Credit,
          amount: params.driverNet,
          idempotencyKey: `trip:${params.paymentId}:driver-credit`,
        },
        {
          accountId: platform.id,
          side: LedgerEntrySide.Credit,
          amount: params.commission,
          idempotencyKey: `trip:${params.paymentId}:platform-credit`,
        },
      ],
    });
  }

  async recordPayout(params: {
    payoutId: string;
    driverId: string;
    regionId: string;
    currency: string;
    amount: number;
  }): Promise<void> {
    const platform = await this.getOrCreatePlatformAccount(params.regionId, params.currency);
    const driver = await this.getOrCreateDriverAccount(
      params.driverId,
      params.regionId,
      params.currency,
    );

    await this.recordJournal({
      refType: 'payout',
      refId: params.payoutId,
      description: 'Driver payout',
      lines: [
        {
          accountId: driver.id,
          side: LedgerEntrySide.Debit,
          amount: params.amount,
          idempotencyKey: `payout:${params.payoutId}:driver-debit`,
        },
        {
          accountId: platform.id,
          side: LedgerEntrySide.Credit,
          amount: params.amount,
          idempotencyKey: `payout:${params.payoutId}:platform-credit`,
        },
      ],
    });
  }
}
