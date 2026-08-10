import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Аудиозаписи поездок (Req §8.7, безопасность клиента).
 */
export class CreateTripRecordings1722600000000 implements MigrationInterface {
  name = 'CreateTripRecordings1722600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trip_recordings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "storage_key" varchar(512) NOT NULL,
        "duration_sec" integer,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_trip_recordings" PRIMARY KEY ("id"),
        CONSTRAINT "fk_trip_recordings_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_trip_recordings_client" FOREIGN KEY ("client_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_trip_recordings_order_id" ON "trip_recordings" ("order_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trip_recordings_order_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_recordings";`);
  }
}
