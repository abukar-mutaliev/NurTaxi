import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Заказы, маршруты и журнал статусов (Фаза 4, Req §13.3, Des §5).
 */
export class CreateOrders1721898000000 implements MigrationInterface {
  name = 'CreateOrders1721898000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM (
        'created', 'searching_driver', 'driver_assigned', 'driver_en_route',
        'driver_arrived', 'in_progress', 'completed', 'closed',
        'cancelled_by_client', 'cancelled_by_driver', 'cancelled_system', 'failed_payment'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM ('cash', 'card');
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL,
        "driver_id" uuid,
        "region_id" uuid NOT NULL,
        "tariff_id" uuid NOT NULL,
        "pickup_lat" double precision NOT NULL,
        "pickup_lng" double precision NOT NULL,
        "pickup_address" text NOT NULL,
        "dropoff_lat" double precision NOT NULL,
        "dropoff_lng" double precision NOT NULL,
        "dropoff_address" text NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'created',
        "price_estimated" decimal(12,2) NOT NULL,
        "price_final" decimal(12,2),
        "cancellation_fee" decimal(12,2),
        "payment_method" "payment_method_enum" NOT NULL,
        "comment" text,
        "family_member_id" uuid,
        "version" int NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_orders" PRIMARY KEY ("id"),
        CONSTRAINT "fk_orders_client" FOREIGN KEY ("client_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orders_driver" FOREIGN KEY ("driver_id")
          REFERENCES "driver_profiles"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_orders_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orders_tariff" FOREIGN KEY ("tariff_id")
          REFERENCES "tariffs"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_orders_client_status" ON "orders" ("client_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_orders_driver_status" ON "orders" ("driver_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_orders_region_created" ON "orders" ("region_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "order_routes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "polyline" text NOT NULL,
        "distance_m" int NOT NULL,
        "duration_s" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_order_routes" PRIMARY KEY ("id"),
        CONSTRAINT "uq_order_routes_order_id" UNIQUE ("order_id"),
        CONSTRAINT "fk_order_routes_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "order_status_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "from_status" "order_status_enum",
        "to_status" "order_status_enum" NOT NULL,
        "actor_id" uuid,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_order_status_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_order_status_logs_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_status_logs_order" ON "order_status_logs" ("order_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_status_logs_order";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_routes";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_region_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_driver_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_client_status";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum";`);
  }
}
