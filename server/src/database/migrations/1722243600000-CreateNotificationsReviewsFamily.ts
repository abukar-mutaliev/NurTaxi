import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Уведомления, отзывы, семейный аккаунт, промо и бонусы (Фаза 8).
 */
export class CreateNotificationsReviewsFamily1722243600000 implements MigrationInterface {
  name = 'CreateNotificationsReviewsFamily1722243600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_channel_enum" AS ENUM ('in_app', 'push', 'sms');
    `);
    await queryRunner.query(`
      CREATE TYPE "review_target_enum" AS ENUM ('driver', 'client');
    `);
    await queryRunner.query(`
      CREATE TYPE "family_member_status_enum" AS ENUM ('pending', 'confirmed', 'revoked');
    `);
    await queryRunner.query(`
      CREATE TYPE "promo_discount_type_enum" AS ENUM ('percent', 'fixed', 'bonus');
    `);
    await queryRunner.query(`
      CREATE TYPE "bonus_transaction_type_enum" AS ENUM ('credit', 'debit');
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" varchar(64) NOT NULL,
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        "channel" "notification_channel_enum" NOT NULL DEFAULT 'in_app',
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_created"
        ON "notifications" ("user_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "target" "review_target_enum" NOT NULL,
        "rating" smallint NOT NULL,
        "text" text,
        "tags" jsonb NOT NULL DEFAULT '[]',
        "is_complaint" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "fk_reviews_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_reviews_author" FOREIGN KEY ("author_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "uq_reviews_order_author" UNIQUE ("order_id", "author_id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "family_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "member_user_id" uuid,
        "member_phone" varchar(20) NOT NULL,
        "relation" varchar(64) NOT NULL,
        "permissions" jsonb NOT NULL DEFAULT '{"track": true, "notify": true, "pay": true}',
        "status" "family_member_status_enum" NOT NULL DEFAULT 'pending',
        "confirm_code" varchar(16),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "confirmed_at" timestamptz,
        CONSTRAINT "pk_family_members" PRIMARY KEY ("id"),
        CONSTRAINT "fk_family_owner" FOREIGN KEY ("owner_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_family_member_user" FOREIGN KEY ("member_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_family_owner_phone"
        ON "family_members" ("owner_id", "member_phone")
        WHERE "status" != 'revoked';
    `);

    await queryRunner.query(`
      CREATE TABLE "promo_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "region_id" uuid NOT NULL,
        "code" varchar(32) NOT NULL,
        "discount_type" "promo_discount_type_enum" NOT NULL,
        "discount_value" decimal(12,2) NOT NULL,
        "max_redemptions" int,
        "redemption_count" int NOT NULL DEFAULT 0,
        "valid_from" timestamptz NOT NULL,
        "valid_until" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_promo_codes" PRIMARY KEY ("id"),
        CONSTRAINT "fk_promo_codes_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_promo_codes_region_code" UNIQUE ("region_id", "code")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "promo_redemptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "promo_code_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "bonus_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "redeemed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_promo_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_promo_redemptions_code" FOREIGN KEY ("promo_code_id")
          REFERENCES "promo_codes"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_promo_redemptions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_promo_redemptions_user_code" UNIQUE ("promo_code_id", "user_id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "bonus_accounts" (
        "user_id" uuid NOT NULL,
        "balance" decimal(12,2) NOT NULL DEFAULT 0,
        "currency" varchar(8) NOT NULL DEFAULT 'RUB',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_bonus_accounts" PRIMARY KEY ("user_id"),
        CONSTRAINT "fk_bonus_accounts_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "bonus_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" "bonus_transaction_type_enum" NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "balance_after" decimal(12,2) NOT NULL,
        "ref_type" varchar(32) NOT NULL,
        "ref_id" uuid,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_bonus_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_bonus_transactions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bonus_transactions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bonus_accounts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_redemptions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "family_members";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bonus_transaction_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "promo_discount_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "family_member_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "review_target_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum";`);
  }
}
