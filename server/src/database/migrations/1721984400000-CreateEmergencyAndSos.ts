import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Экстренные контакты и журнал SOS (Фаза 5, Req §8.7).
 */
export class CreateEmergencyAndSos1721984400000 implements MigrationInterface {
  name = 'CreateEmergencyAndSos1721984400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "emergency_contacts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_emergency_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_emergency_contacts_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_emergency_contacts_user_id" ON "emergency_contacts" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "sos_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "lat" double precision NOT NULL,
        "lng" double precision NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "contacts_notified" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_sos_events" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sos_events_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sos_events_client" FOREIGN KEY ("client_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sos_events_order_id" ON "sos_events" ("order_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sos_events_order_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sos_events";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_emergency_contacts_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emergency_contacts";`);
  }
}
