import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Регионы (минимум для анкеты водителя), профили водителей, ТС и документы (Фаза 2).
 */
export class CreateDrivers1721725200000 implements MigrationInterface {
  name = 'CreateDrivers1721725200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "regions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "timezone" varchar(64) NOT NULL DEFAULT 'Europe/Moscow',
        "currency" varchar(8) NOT NULL DEFAULT 'RUB',
        "feature_flags" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_regions" PRIMARY KEY ("id")
      );
    `);

    // Стартовый регион MVP — Республика Ингушетия (Req §5).
    await queryRunner.query(`
      INSERT INTO "regions" ("id", "name", "timezone", "currency")
      VALUES (
        '00000000-0000-4000-8000-000000000001',
        'Республика Ингушетия',
        'Europe/Moscow',
        'RUB'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "verification_status_enum" AS ENUM (
        'draft', 'pending', 'in_review', 'approved', 'rejected'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "driver_online_status_enum" AS ENUM ('offline', 'online', 'busy');
    `);
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM (
        'passport', 'license', 'sts', 'osago', 'car_photo', 'interior_photo', 'selfie'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "document_status_enum" AS ENUM ('pending', 'approved', 'rejected');
    `);

    await queryRunner.query(`
      CREATE TABLE "driver_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "full_name" varchar(200) NOT NULL,
        "birth_date" date NOT NULL,
        "residence_address" text NOT NULL,
        "driving_experience_years" smallint NOT NULL,
        "region_id" uuid NOT NULL,
        "verification_status" "verification_status_enum" NOT NULL DEFAULT 'draft',
        "online_status" "driver_online_status_enum" NOT NULL DEFAULT 'offline',
        "rating" decimal(3,2) NOT NULL DEFAULT 5.00,
        "trips_count" int NOT NULL DEFAULT 0,
        "work_schedule" jsonb NOT NULL DEFAULT '{}',
        "balance" decimal(12,2) NOT NULL DEFAULT 0,
        "rejection_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_driver_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "fk_driver_profiles_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_driver_profiles_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_driver_profiles_user_id" ON "driver_profiles" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "driver_id" uuid NOT NULL,
        "make" varchar(80) NOT NULL,
        "model" varchar(80) NOT NULL,
        "plate_number" varchar(20) NOT NULL,
        "color" varchar(40) NOT NULL,
        "year" smallint NOT NULL,
        "photo_url" text,
        "interior_photo_url" text,
        "is_primary" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "fk_vehicles_driver" FOREIGN KEY ("driver_id")
          REFERENCES "driver_profiles"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "driver_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "driver_id" uuid NOT NULL,
        "type" "document_type_enum" NOT NULL,
        "storage_key" text NOT NULL,
        "content_type" varchar(120) NOT NULL,
        "status" "document_status_enum" NOT NULL DEFAULT 'pending',
        "moderator_id" uuid,
        "rejection_reason" text,
        "verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_driver_documents" PRIMARY KEY ("id"),
        CONSTRAINT "fk_driver_documents_driver" FOREIGN KEY ("driver_id")
          REFERENCES "driver_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_driver_documents_moderator" FOREIGN KEY ("moderator_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_driver_documents_driver_type"
        ON "driver_documents" ("driver_id", "type");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_driver_documents_driver_type";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_documents";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_driver_profiles_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_profiles";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "driver_online_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "verification_status_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "regions";`);
  }
}
