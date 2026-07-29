import { MigrationInterface, QueryRunner } from 'typeorm';

/** Push-токены устройств для Expo/FCM/APNs (M10.1, Req §23). */
export class CreatePushDeviceTokens1722500000000 implements MigrationInterface {
  name = 'CreatePushDeviceTokens1722500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "push_platform_enum" AS ENUM ('ios', 'android');
    `);
    await queryRunner.query(`
      CREATE TABLE "push_device_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token" varchar(255) NOT NULL,
        "platform" "push_platform_enum" NOT NULL,
        "device_id" varchar(128),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_push_device_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "fk_push_device_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_push_device_tokens_token" UNIQUE ("token")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_push_device_tokens_user"
        ON "push_device_tokens" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "push_device_tokens";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "push_platform_enum";`);
  }
}
