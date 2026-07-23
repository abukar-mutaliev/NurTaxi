import { MigrationInterface, QueryRunner } from 'typeorm';

/** MVP-регион из миграции Фазы 2. */
const INGUSHETIA_REGION_ID = '00000000-0000-4000-8000-000000000001';
const STANDARD_TARIFF_ID = '00000000-0000-4000-8000-000000000101';

/**
 * Города, тарифы, сохранённые адреса (Фаза 3, Req §6.3, §8.5, §22, Des §4, §7).
 */
export class CreateGeoAndTariffs1721811600000 implements MigrationInterface {
  name = 'CreateGeoAndTariffs1721811600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "region_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "boundaries" jsonb,
        "center_lat" double precision,
        "center_lng" double precision,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_cities" PRIMARY KEY ("id"),
        CONSTRAINT "fk_cities_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "tariffs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "region_id" uuid NOT NULL,
        "name" varchar(80) NOT NULL,
        "base_fare" decimal(10,2) NOT NULL,
        "price_per_km" decimal(10,2) NOT NULL,
        "price_per_min" decimal(10,2) NOT NULL,
        "min_price" decimal(10,2) NOT NULL,
        "surge_rules" jsonb NOT NULL DEFAULT '{}',
        "commission_percent" decimal(5,2) NOT NULL DEFAULT 15.00,
        "cancellation_policy" jsonb NOT NULL DEFAULT '{}',
        "effective_from" timestamptz NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_tariffs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_tariffs_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tariffs_region_effective"
        ON "tariffs" ("region_id", "effective_from" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "saved_addresses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "label" varchar(60) NOT NULL,
        "address" text NOT NULL,
        "lat" double precision NOT NULL,
        "lng" double precision NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_saved_addresses" PRIMARY KEY ("id"),
        CONSTRAINT "fk_saved_addresses_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_saved_addresses_user_id" ON "saved_addresses" ("user_id");
    `);

    // Города Республики Ингушетия (MVP).
    await queryRunner.query(`
      INSERT INTO "cities" ("id", "region_id", "name", "center_lat", "center_lng") VALUES
        ('00000000-0000-4000-8000-000000000011', '${INGUSHETIA_REGION_ID}', 'Назрань', 43.2167, 44.7667),
        ('00000000-0000-4000-8000-000000000012', '${INGUSHETIA_REGION_ID}', 'Магас', 43.1667, 44.8000),
        ('00000000-0000-4000-8000-000000000013', '${INGUSHETIA_REGION_ID}', 'Сунжа', 43.3167, 44.8333),
        ('00000000-0000-4000-8000-000000000014', '${INGUSHETIA_REGION_ID}', 'Карабулак', 43.3056, 44.9083),
        ('00000000-0000-4000-8000-000000000015', '${INGUSHETIA_REGION_ID}', 'Малгобек', 43.5083, 44.5833);
    `);

    // Тариф «Стандарт» для MVP.
    await queryRunner.query(`
      INSERT INTO "tariffs" (
        "id", "region_id", "name",
        "base_fare", "price_per_km", "price_per_min", "min_price",
        "surge_rules", "commission_percent", "cancellation_policy", "effective_from"
      ) VALUES (
        '${STANDARD_TARIFF_ID}',
        '${INGUSHETIA_REGION_ID}',
        'Стандарт',
        99.00, 18.00, 5.00, 149.00,
        '{"enabled": false, "multiplier": 1.0}',
        15.00,
        '{"freeCancelBeforeAssigned": true, "feeAfterAssigned": 100, "feeAfterArrived": 150}',
        '2026-01-01T00:00:00Z'
      );
    `);

    // Feature-flags региона MVP.
    await queryRunner.query(`
      UPDATE "regions"
      SET "feature_flags" = '{"surge_pricing": false, "promo_codes": false, "family_account": true}'
      WHERE "id" = '${INGUSHETIA_REGION_ID}';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_saved_addresses_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_addresses";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tariffs_region_effective";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tariffs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cities";`);
  }
}
