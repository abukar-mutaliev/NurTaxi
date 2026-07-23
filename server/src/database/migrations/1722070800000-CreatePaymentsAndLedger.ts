import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Платежи, ledger (двойная запись), выплаты, чеки, outbox (Фаза 6, Des §8).
 */
export class CreatePaymentsAndLedger1722070800000 implements MigrationInterface {
  name = 'CreatePaymentsAndLedger1722070800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'processing', 'succeeded', 'failed');
    `);
    await queryRunner.query(`
      CREATE TYPE "payout_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');
    `);
    await queryRunner.query(`
      CREATE TYPE "ledger_account_type_enum" AS ENUM ('platform', 'driver');
    `);
    await queryRunner.query(`
      CREATE TYPE "ledger_entry_side_enum" AS ENUM ('debit', 'credit');
    `);
    await queryRunner.query(`
      CREATE TYPE "outbox_status_enum" AS ENUM ('pending', 'published', 'failed');
    `);

    await queryRunner.query(`
      CREATE TABLE "ledger_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "account_type" "ledger_account_type_enum" NOT NULL,
        "owner_id" uuid,
        "region_id" uuid NOT NULL,
        "currency" varchar(8) NOT NULL DEFAULT 'RUB',
        "balance" decimal(12,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ledger_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ledger_accounts_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_ledger_accounts_driver" FOREIGN KEY ("owner_id")
          REFERENCES "driver_profiles"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ledger_accounts_platform_region"
        ON "ledger_accounts" ("region_id")
        WHERE "account_type" = 'platform';
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ledger_accounts_driver"
        ON "ledger_accounts" ("owner_id")
        WHERE "account_type" = 'driver';
    `);

    await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "journal_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "side" "ledger_entry_side_enum" NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "balance_after" decimal(12,2) NOT NULL,
        "ref_type" varchar(32) NOT NULL,
        "ref_id" uuid NOT NULL,
        "idempotency_key" varchar(128),
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ledger_entries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ledger_entries_account" FOREIGN KEY ("account_id")
          REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ledger_entries_idempotency"
        ON "ledger_entries" ("idempotency_key")
        WHERE "idempotency_key" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ledger_entries_account_created"
        ON "ledger_entries" ("account_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(8) NOT NULL,
        "provider" varchar(64) NOT NULL DEFAULT 'stub',
        "status" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "external_transaction_id" varchar(128),
        "idempotency_key" varchar(128) NOT NULL,
        "commission_amount" decimal(12,2),
        "driver_net_amount" decimal(12,2),
        "retry_count" int NOT NULL DEFAULT 0,
        "next_retry_at" timestamptz,
        "failure_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payments_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_payments_idempotency" UNIQUE ("idempotency_key")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_payments_order" ON "payments" ("order_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_payments_retry"
        ON "payments" ("status", "next_retry_at")
        WHERE "status" = 'failed' AND "next_retry_at" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "payouts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "driver_id" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(8) NOT NULL,
        "status" "payout_status_enum" NOT NULL DEFAULT 'pending',
        "provider" varchar(64) NOT NULL DEFAULT 'stub',
        "external_payout_id" varchar(128),
        "idempotency_key" varchar(128) NOT NULL,
        "failure_reason" text,
        "requested_at" timestamptz NOT NULL DEFAULT now(),
        "processed_at" timestamptz,
        CONSTRAINT "pk_payouts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payouts_driver" FOREIGN KEY ("driver_id")
          REFERENCES "driver_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_payouts_idempotency" UNIQUE ("idempotency_key")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "receipts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "payment_id" uuid,
        "receipt_number" varchar(32) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(8) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "issued_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_receipts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_receipts_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_receipts_payment" FOREIGN KEY ("payment_id")
          REFERENCES "payments"("id") ON DELETE SET NULL,
        CONSTRAINT "uq_receipts_order" UNIQUE ("order_id"),
        CONSTRAINT "uq_receipts_number" UNIQUE ("receipt_number")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_type" varchar(64) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "outbox_status_enum" NOT NULL DEFAULT 'pending',
        "attempts" int NOT NULL DEFAULT 0,
        "last_error" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "published_at" timestamptz,
        CONSTRAINT "pk_outbox_events" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_outbox_pending" ON "outbox_events" ("status", "created_at")
        WHERE "status" = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "receipts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payouts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_accounts";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "outbox_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_entry_side_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ledger_account_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payout_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum";`);
  }
}
