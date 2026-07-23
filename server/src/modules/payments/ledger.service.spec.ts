import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LedgerEntrySide } from './enums/payment.enums';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  let service: LedgerService;

  const accountStore = new Map<string, LedgerAccount>();
  const entryStore: LedgerEntry[] = [];

  const accountsRepo = {
    findOne: jest.fn(async ({ where }: { where: Partial<LedgerAccount> }) => {
      for (const account of accountStore.values()) {
        if (where.id && account.id !== where.id) continue;
        if (where.accountType && account.accountType !== where.accountType) continue;
        if (where.regionId && account.regionId !== where.regionId) continue;
        if (where.ownerId !== undefined && account.ownerId !== where.ownerId) continue;
        return account;
      }
      return null;
    }),
    findOneOrFail: jest.fn(async ({ where }: { where: { id: string } }) => {
      const account = accountStore.get(where.id);
      if (!account) throw new Error('not found');
      return account;
    }),
    create: jest.fn((data: Partial<LedgerAccount>) => ({
      id: `acc-${accountStore.size + 1}`,
      balance: '0',
      ...data,
    })),
    save: jest.fn(async (account: LedgerAccount) => {
      accountStore.set(account.id, { ...account });
      return account;
    }),
  };

  const entriesRepo = {
    findOne: jest.fn(
      async ({ where }: { where: { idempotencyKey?: string } }) =>
        entryStore.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null,
    ),
    find: jest.fn(async () => entryStore),
    create: jest.fn((data: Partial<LedgerEntry>) => ({
      id: `entry-${entryStore.length + 1}`,
      ...data,
    })),
    save: jest.fn(async (entry: LedgerEntry) => {
      entryStore.push(entry);
      return entry;
    }),
  };

  beforeEach(async () => {
    accountStore.clear();
    entryStore.length = 0;
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: getRepositoryToken(LedgerAccount), useValue: accountsRepo },
        { provide: getRepositoryToken(LedgerEntry), useValue: entriesRepo },
      ],
    }).compile();

    service = moduleRef.get(LedgerService);
  });

  it('отклоняет несбалансированный journal', async () => {
    const platform = await service.getOrCreatePlatformAccount('region-1', 'RUB');

    await expect(
      service.recordJournal({
        refType: 'test',
        refId: 'ref-1',
        lines: [
          { accountId: platform.id, side: LedgerEntrySide.Debit, amount: 100 },
          { accountId: platform.id, side: LedgerEntrySide.Credit, amount: 50 },
        ],
      }),
    ).rejects.toThrow(/unbalanced/i);
  });

  it('recordTripSettlement создаёт сбалансированные проводки', async () => {
    await service.recordTripSettlement({
      paymentId: 'pay-1',
      regionId: 'region-1',
      currency: 'RUB',
      driverId: 'driver-1',
      gross: 100,
      commission: 15,
      driverNet: 85,
    });

    expect(entryStore.length).toBe(3);
    const driverBalance = await service.getDriverBalance('driver-1');
    expect(driverBalance).toBe(85);
  });
});
