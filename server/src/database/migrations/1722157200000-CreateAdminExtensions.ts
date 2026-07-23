import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Админ-расширения: привязка staff к региону, конфигурация провайдеров (Фаза 7).
 */
export class CreateAdminExtensions1722157200000 implements MigrationInterface {
  name = 'CreateAdminExtensions1722157200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "provider_type_enum" AS ENUM ('payment', 'sms', 'maps');
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "assigned_region_id" uuid,
        ADD CONSTRAINT "fk_users_assigned_region"
          FOREIGN KEY ("assigned_region_id") REFERENCES "regions"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "provider_configs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "region_id" uuid NOT NULL,
        "type" "provider_type_enum" NOT NULL,
        "provider" varchar(64) NOT NULL,
        "credentials_ref" varchar(256) NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_provider_configs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_provider_configs_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_provider_configs_region_type"
        ON "provider_configs" ("region_id", "type")
        WHERE "is_active" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_configs";`);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_assigned_region";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "assigned_region_id";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_type_enum";`);
  }
}
