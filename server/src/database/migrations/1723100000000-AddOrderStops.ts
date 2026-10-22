import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Промежуточные остановки поездки: массив `{ lat, lng, address }` по порядку.
 */
export class AddOrderStops1723100000000 implements MigrationInterface {
  name = 'AddOrderStops1723100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "stops" jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "stops";
    `);
  }
}
