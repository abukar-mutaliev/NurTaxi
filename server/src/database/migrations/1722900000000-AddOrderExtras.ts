import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Пожелания к заказу: детское кресло и поездка для другого пассажира.
 */
export class AddOrderExtras1722900000000 implements MigrationInterface {
  name = 'AddOrderExtras1722900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "child_seat" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "passenger_name" text,
        ADD COLUMN IF NOT EXISTS "passenger_phone" varchar(16);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "passenger_phone",
        DROP COLUMN IF EXISTS "passenger_name",
        DROP COLUMN IF EXISTS "child_seat";
    `);
  }
}
