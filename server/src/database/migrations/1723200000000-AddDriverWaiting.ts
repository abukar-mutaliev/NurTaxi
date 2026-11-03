import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ожидание пассажира: момент «Я на месте» и зафиксированная плата за ожидание.
 */
export class AddDriverWaiting1723200000000 implements MigrationInterface {
  name = 'AddDriverWaiting1723200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "driver_arrived_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "waiting_fee" decimal(12,2);
    `);
    await queryRunner.query(`
      UPDATE "orders" AS o
      SET "driver_arrived_at" = l.created_at
      FROM (
        SELECT DISTINCT ON (order_id) order_id, created_at
        FROM "order_status_logs"
        WHERE to_status = 'driver_arrived'
        ORDER BY order_id, created_at DESC
      ) AS l
      WHERE o.id = l.order_id
        AND o.driver_arrived_at IS NULL
        AND o.status = 'driver_arrived';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "waiting_fee",
        DROP COLUMN IF EXISTS "driver_arrived_at";
    `);
  }
}
