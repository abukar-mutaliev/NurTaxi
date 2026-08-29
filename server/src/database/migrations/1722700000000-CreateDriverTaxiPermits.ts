import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Разрешение на деятельность такси в анкете водителя (Req §8.2) и режимы региональных
 * требований (Req §7.6): регион включает блок как обязательный или необязательный из
 * админ-панели, без релиза мобильных приложений.
 */
export class CreateDriverTaxiPermits1722700000000 implements MigrationInterface {
  name = 'CreateDriverTaxiPermits1722700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "regions"
        ADD COLUMN "driver_requirements" jsonb NOT NULL DEFAULT '{}';
    `);

    // Пересоздаём enum вместо ALTER TYPE ... ADD VALUE: так миграция остаётся
    // транзакционной и не зависит от версии PostgreSQL.
    await queryRunner.query(`ALTER TYPE "document_type_enum" RENAME TO "document_type_enum_old";`);
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM (
        'passport', 'license', 'sts', 'osago', 'car_photo', 'interior_photo', 'selfie', 'taxi_permit'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "driver_documents"
        ALTER COLUMN "type" TYPE "document_type_enum" USING "type"::text::"document_type_enum";
    `);
    await queryRunner.query(`DROP TYPE "document_type_enum_old";`);

    await queryRunner.query(`
      CREATE TABLE "driver_taxi_permits" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "driver_id" uuid NOT NULL,
        "number" varchar(64) NOT NULL,
        "issuing_region" varchar(160) NOT NULL,
        "issued_at" date NOT NULL,
        "expires_at" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_driver_taxi_permits" PRIMARY KEY ("id"),
        CONSTRAINT "fk_driver_taxi_permits_driver" FOREIGN KEY ("driver_id")
          REFERENCES "driver_profiles"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_driver_taxi_permits_driver_id"
        ON "driver_taxi_permits" ("driver_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_driver_taxi_permits_expires_at"
        ON "driver_taxi_permits" ("expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_driver_taxi_permits_expires_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_driver_taxi_permits_driver_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_taxi_permits";`);

    await queryRunner.query(`DELETE FROM "driver_documents" WHERE "type" = 'taxi_permit';`);
    await queryRunner.query(`ALTER TYPE "document_type_enum" RENAME TO "document_type_enum_new";`);
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM (
        'passport', 'license', 'sts', 'osago', 'car_photo', 'interior_photo', 'selfie'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "driver_documents"
        ALTER COLUMN "type" TYPE "document_type_enum" USING "type"::text::"document_type_enum";
    `);
    await queryRunner.query(`DROP TYPE "document_type_enum_new";`);

    await queryRunner.query(`ALTER TABLE "regions" DROP COLUMN "driver_requirements";`);
  }
}
