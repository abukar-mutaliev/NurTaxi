import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Таблица пользователей и роли (Фаза 1, Req §7, §8.1, §8.3, Des §13.1).
 */
export class CreateUsers1721638800000 implements MigrationInterface {
  name = 'CreateUsers1721638800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM (
        'client', 'driver', 'operator', 'regional_admin', 'super_admin'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "users_status_enum" AS ENUM ('active', 'blocked', 'deleted');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "phone" varchar(20) NOT NULL,
        "name" varchar(120),
        "photo_url" text,
        "role" "users_role_enum" NOT NULL DEFAULT 'client',
        "language" varchar(8) NOT NULL DEFAULT 'ru',
        "status" "users_status_enum" NOT NULL DEFAULT 'active',
        "privacy_settings" jsonb NOT NULL DEFAULT '{}',
        "notification_settings" jsonb NOT NULL DEFAULT '{}',
        "pdn_consent_at" timestamptz,
        "pdn_consent_version" varchar(20),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_phone";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
  }
}
