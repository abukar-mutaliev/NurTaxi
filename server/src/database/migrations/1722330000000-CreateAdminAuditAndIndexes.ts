import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Фаза 9: аудит админ-действий, индексы для крупных таблиц (Des §12, Req §20).
 * Партиционирование notifications/order_status_logs — следующий шаг при росте объёма.
 */
export class CreateAdminAuditAndIndexes1722330000000 implements MigrationInterface {
  name = 'CreateAdminAuditAndIndexes1722330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_id" uuid,
        "region_id" uuid,
        "action" varchar(64) NOT NULL,
        "resource_type" varchar(64) NOT NULL,
        "resource_id" varchar(64),
        "payload" jsonb NOT NULL DEFAULT '{}',
        "ip_address" varchar(45),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_admin_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_admin_audit_actor" FOREIGN KEY ("actor_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_admin_audit_actor" ON "admin_audit_logs" ("actor_id", "created_at" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_admin_audit_region" ON "admin_audit_logs" ("region_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_created"
        ON "notifications" ("created_at" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_status_logs_created"
        ON "order_status_logs" ("created_at" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ledger_entries_created"
        ON "ledger_entries" ("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ledger_entries_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_status_logs_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_admin_audit_region";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_admin_audit_actor";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audit_logs";`);
  }
}
