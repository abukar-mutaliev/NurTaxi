import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Дополнение 580-ФЗ: шифрование реквизитов разрешений, checksum журнала (C3.7, C5.14).
 */
export class Compliance580fzRemainder1722801000000 implements MigrationInterface {
  name = 'Compliance580fzRemainder1722801000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "taxi_permits"
        ALTER COLUMN "number" TYPE varchar(512),
        ALTER COLUMN "issued_by" TYPE varchar(512);
    `);
    await queryRunner.query(`
      ALTER TABLE "driver_taxi_permits"
        ALTER COLUMN "number" TYPE varchar(512),
        ALTER COLUMN "issuing_region" TYPE varchar(512);
    `);
    await queryRunner.query(`
      ALTER TABLE "order_status_logs"
        ADD COLUMN IF NOT EXISTS "prev_checksum" varchar(64),
        ADD COLUMN IF NOT EXISTS "record_checksum" varchar(64);
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION nurtaxi_forbid_journal_mutation()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' AND nurtaxi_journal_purge_allowed() THEN
          RETURN OLD;
        END IF;
        IF TG_OP = 'UPDATE' AND nurtaxi_journal_purge_allowed() THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'JOURNAL_IMMUTABLE: table % is append-only', TG_TABLE_NAME
          USING ERRCODE = 'restrict_violation';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`SELECT set_config('nurtaxi.allow_journal_purge', 'on', true)`);
    await queryRunner.query(`
      UPDATE "order_status_logs"
      SET "record_checksum" = encode(
        digest(
          concat_ws('|',
            "order_id"::text,
            coalesce("from_status"::text, ''),
            "to_status"::text,
            coalesce("actor_id"::text, ''),
            coalesce("reason", ''),
            coalesce("prev_checksum", '')
          ),
          'sha256'
        ),
        'hex'
      )
      WHERE "record_checksum" IS NULL;
    `);
    await queryRunner.query(`SELECT set_config('nurtaxi.allow_journal_purge', 'off', true)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_status_logs" DROP COLUMN IF EXISTS "record_checksum"`);
    await queryRunner.query(`ALTER TABLE "order_status_logs" DROP COLUMN IF EXISTS "prev_checksum"`);
  }
}
