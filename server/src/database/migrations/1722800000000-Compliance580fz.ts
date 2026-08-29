import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Соответствие 580-ФЗ: перевозчик/разрешение, журнал заказа, площадки,
 * выгрузки, реестр, РИС, защита журналов (фазы C0–C8).
 */
export class Compliance580fz1722800000000 implements MigrationInterface {
  name = 'Compliance580fz1722800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.recreateEnum(
      queryRunner,
      'users_role_enum',
      ['client', 'driver', 'operator', 'regional_admin', 'super_admin', 'regulator'],
      [{ table: 'users', column: 'role' }],
    );
    await this.recreateEnum(
      queryRunner,
      'provider_type_enum',
      ['payment', 'sms', 'maps', 'taxi_registry'],
      [{ table: 'provider_configs', column: 'type' }],
    );

    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS "order_public_number_seq" START WITH 100001 INCREMENT BY 1;
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN "public_number" varchar(20),
        ADD COLUMN "assignment_snapshot" jsonb,
        ADD COLUMN "trip_started_at" timestamptz,
        ADD COLUMN "trip_ended_at" timestamptz,
        ADD COLUMN "completeness_status" varchar(32) NOT NULL DEFAULT 'pending',
        ADD COLUMN "vehicle_id" uuid,
        ADD COLUMN "carrier_id" uuid,
        ADD COLUMN "permit_id" uuid;
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "public_number" = 'NT-H-' || UPPER(SUBSTR(REPLACE("id"::text, '-', ''), 1, 8))
      WHERE "public_number" IS NULL;
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "assignment_snapshot" = '{"historicallyUnavailable":true,"driver":"HISTORICALLY_UNAVAILABLE","vehicle":"HISTORICALLY_UNAVAILABLE","carrier":"HISTORICALLY_UNAVAILABLE","permit":"HISTORICALLY_UNAVAILABLE","contacts":{"driverPhone":null,"clientPhone":null}}'::jsonb,
          "completeness_status" = 'historically_unavailable'
      WHERE "status" IN ('closed', 'cancelled_by_client', 'cancelled_by_driver', 'cancelled_system')
        AND "assignment_snapshot" IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
        ALTER COLUMN "public_number" SET NOT NULL,
        ALTER COLUMN "public_number" SET DEFAULT ('NT-' || lpad(nextval('order_public_number_seq')::text, 8, '0'));
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_orders_public_number" ON "orders" ("public_number");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_orders_trip_ended" ON "orders" ("trip_ended_at");
    `);

    await queryRunner.query(`
      ALTER TABLE "vehicles"
        ADD COLUMN "vin" varchar(17),
        ADD COLUMN "current_permit_id" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE "regions"
        ADD COLUMN "compliance_config" jsonb NOT NULL DEFAULT '{}';
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_audit_logs"
        ADD COLUMN "user_agent" varchar(512),
        ADD COLUMN "result" varchar(32) NOT NULL DEFAULT 'success',
        ADD COLUMN "previous_value" jsonb,
        ADD COLUMN "new_value" jsonb;
    `);

    await queryRunner.query(`
      ALTER TABLE "order_status_logs" DROP CONSTRAINT "fk_order_status_logs_order";
      ALTER TABLE "order_status_logs"
        ADD CONSTRAINT "fk_order_status_logs_order"
        FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      ALTER TABLE "order_routes" DROP CONSTRAINT "fk_order_routes_order";
      ALTER TABLE "order_routes"
        ADD CONSTRAINT "fk_order_routes_order"
        FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      ALTER TABLE "trip_recordings" DROP CONSTRAINT "fk_trip_recordings_order";
      ALTER TABLE "trip_recordings"
        ADD CONSTRAINT "fk_trip_recordings_order"
        FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      CREATE TABLE "carriers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(240) NOT NULL,
        "legal_form" varchar(32) NOT NULL,
        "inn" varchar(12) NOT NULL,
        "ogrn" varchar(15) NOT NULL,
        "address" text NOT NULL,
        "phone" varchar(20),
        "email" varchar(160),
        "region_id" uuid NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "registry_status" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_carriers" PRIMARY KEY ("id"),
        CONSTRAINT "fk_carriers_region" FOREIGN KEY ("region_id")
          REFERENCES "regions"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_carriers_inn" ON "carriers" ("inn");`);

    await queryRunner.query(`
      CREATE TABLE "taxi_permits" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "number" varchar(64) NOT NULL,
        "issued_by" varchar(240) NOT NULL,
        "issued_at" date NOT NULL,
        "expires_at" date,
        "carrier_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_taxi_permits" PRIMARY KEY ("id"),
        CONSTRAINT "fk_taxi_permits_carrier" FOREIGN KEY ("carrier_id")
          REFERENCES "carriers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_taxi_permits_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_taxi_permits_number_issuer"
        ON "taxi_permits" ("number", "issued_by");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_taxi_permits_expires_at" ON "taxi_permits" ("expires_at");
    `);

    await queryRunner.query(`
      ALTER TABLE "vehicles"
        ADD CONSTRAINT "fk_vehicles_current_permit"
        FOREIGN KEY ("current_permit_id") REFERENCES "taxi_permits"("id") ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD CONSTRAINT "fk_orders_vehicle"
        FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "fk_orders_carrier"
        FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "fk_orders_permit"
        FOREIGN KEY ("permit_id") REFERENCES "taxi_permits"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "driver_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "driver_id" uuid NOT NULL,
        "carrier_id" uuid NOT NULL,
        "vehicle_id" uuid,
        "valid_from" timestamptz NOT NULL,
        "valid_to" timestamptz,
        "basis" varchar(160),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_driver_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_driver_assignments_driver" FOREIGN KEY ("driver_id")
          REFERENCES "driver_profiles"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_driver_assignments_carrier" FOREIGN KEY ("carrier_id")
          REFERENCES "carriers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_driver_assignments_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_driver_assignments_driver_period"
        ON "driver_assignments" ("driver_id", "valid_from", "valid_to");
    `);

    await queryRunner.query(`
      CREATE TABLE "order_offer_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "driver_id" uuid NOT NULL,
        "offered_at" timestamptz NOT NULL,
        "timeout_sec" int NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "outcome" varchar(32) NOT NULL DEFAULT 'pending',
        "outcome_at" timestamptz,
        "assigned" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_order_offer_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_order_offer_logs_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_order_offer_logs_order" ON "order_offer_logs" ("order_id", "offered_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "trip_track_points" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "lat" double precision NOT NULL,
        "lng" double precision NOT NULL,
        "accuracy_m" double precision,
        "recorded_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_trip_track_points" PRIMARY KEY ("id"),
        CONSTRAINT "fk_trip_track_points_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_trip_track_order_time" ON "trip_track_points" ("order_id", "recorded_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "placement_sites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(160) NOT NULL,
        "operator" varchar(240) NOT NULL,
        "address" text NOT NULL,
        "region_code" varchar(32) NOT NULL,
        "purpose" varchar(32) NOT NULL,
        "contract_ref" varchar(160),
        "period_from" date NOT NULL,
        "period_to" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_placement_sites" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "placement_components" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "component_key" varchar(80) NOT NULL,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_placement_components" PRIMARY KEY ("id"),
        CONSTRAINT "fk_placement_components_site" FOREIGN KEY ("site_id")
          REFERENCES "placement_sites"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_placement_components_key" ON "placement_components" ("component_key");
    `);
    await queryRunner.query(`
      CREATE TABLE "placement_subcontractors" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "name" varchar(240) NOT NULL,
        "role" varchar(120) NOT NULL,
        "period_from" date NOT NULL,
        "period_to" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_placement_subcontractors" PRIMARY KEY ("id"),
        CONSTRAINT "fk_placement_subcontractors_site" FOREIGN KEY ("site_id")
          REFERENCES "placement_sites"("id") ON DELETE RESTRICT
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "placement_site_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "action" varchar(64) NOT NULL,
        "actor_id" uuid,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_placement_site_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_placement_site_logs_site" FOREIGN KEY ("site_id")
          REFERENCES "placement_sites"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "regulatory_exports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "requested_by" uuid NOT NULL,
        "legal_basis" text NOT NULL,
        "request_ref" varchar(160) NOT NULL,
        "period_from" timestamptz NOT NULL,
        "period_to" timestamptz NOT NULL,
        "date_field" varchar(16) NOT NULL DEFAULT 'created',
        "region_id" uuid,
        "format" varchar(8) NOT NULL DEFAULT 'csv',
        "status" varchar(16) NOT NULL DEFAULT 'queued',
        "storage_key" varchar(512),
        "checksum" varchar(64),
        "row_count" int,
        "error_message" text,
        "expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_regulatory_exports" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "regulatory_disclosures" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "export_id" uuid,
        "actor_id" uuid NOT NULL,
        "legal_basis" text NOT NULL,
        "request_ref" varchar(160) NOT NULL,
        "period_from" timestamptz NOT NULL,
        "period_to" timestamptz NOT NULL,
        "row_count" int NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_regulatory_disclosures" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_event_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "type" varchar(32) NOT NULL,
        "phone" varchar(20),
        "ip_address" varchar(45),
        "user_agent" varchar(512),
        "success" boolean NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_auth_event_logs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_auth_event_logs_created" ON "auth_event_logs" ("created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "taxi_registry_checks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subject_type" varchar(32) NOT NULL,
        "subject_id" uuid NOT NULL,
        "region_id" uuid NOT NULL,
        "source" varchar(80) NOT NULL,
        "request" jsonb NOT NULL DEFAULT '{}',
        "response" jsonb NOT NULL DEFAULT '{}',
        "verdict" varchar(32) NOT NULL,
        "checked_at" timestamptz NOT NULL,
        "valid_until" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_taxi_registry_checks" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_taxi_registry_checks_subject"
        ON "taxi_registry_checks" ("subject_type", "subject_id", "checked_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE "integration_outbox" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "channel" varchar(32) NOT NULL,
        "region_id" uuid,
        "destination" varchar(80),
        "event_type" varchar(64) NOT NULL,
        "aggregate_id" uuid,
        "payload" jsonb NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "attempts" int NOT NULL DEFAULT 0,
        "last_error" text,
        "response" jsonb,
        "next_attempt_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "published_at" timestamptz,
        CONSTRAINT "pk_integration_outbox" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_integration_outbox_pending"
        ON "integration_outbox" ("status", "created_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "retention_purge_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "retention_months" int NOT NULL,
        "cutoff_at" timestamptz NOT NULL,
        "orders_touched" int NOT NULL DEFAULT 0,
        "status" varchar(32) NOT NULL,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_retention_purge_runs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "app_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" varchar(64) NOT NULL,
        "value" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_app_settings" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_app_settings_key" ON "app_settings" ("key");`);
    await queryRunner.query(`
      INSERT INTO "app_settings" ("key", "value")
      VALUES ('order_retention_months', '{"months": 6}');
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION nurtaxi_journal_purge_allowed()
      RETURNS boolean AS $$
        SELECT current_setting('nurtaxi.allow_journal_purge', true) = 'on';
      $$ LANGUAGE sql;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION nurtaxi_forbid_journal_mutation()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' AND nurtaxi_journal_purge_allowed() THEN
          RETURN OLD;
        END IF;
        RAISE EXCEPTION 'JOURNAL_IMMUTABLE: table % is append-only', TG_TABLE_NAME
          USING ERRCODE = 'restrict_violation';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION nurtaxi_protect_offer_log()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF nurtaxi_journal_purge_allowed() THEN
            RETURN OLD;
          END IF;
          RAISE EXCEPTION 'JOURNAL_IMMUTABLE: order_offer_logs cannot be deleted'
            USING ERRCODE = 'restrict_violation';
        END IF;
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.order_id IS DISTINCT FROM OLD.order_id
           OR NEW.driver_id IS DISTINCT FROM OLD.driver_id
           OR NEW.offered_at IS DISTINCT FROM OLD.offered_at THEN
          RAISE EXCEPTION 'JOURNAL_IMMUTABLE: identity fields of offer log cannot change'
            USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const immutableTables = [
      'order_status_logs',
      'admin_audit_logs',
      'regulatory_disclosures',
      'auth_event_logs',
      'taxi_registry_checks',
      'placement_site_logs',
    ];
    for (const table of immutableTables) {
      await queryRunner.query(`
        CREATE TRIGGER "trg_${table}_immutable"
          BEFORE UPDATE OR DELETE ON "${table}"
          FOR EACH ROW EXECUTE FUNCTION nurtaxi_forbid_journal_mutation();
      `);
    }
    await queryRunner.query(`
      CREATE TRIGGER "trg_order_offer_logs_protect"
        BEFORE UPDATE OR DELETE ON "order_offer_logs"
        FOR EACH ROW EXECUTE FUNCTION nurtaxi_protect_offer_log();
    `);

    await queryRunner.query(`
      INSERT INTO "placement_sites"
        ("name", "operator", "address", "region_code", "purpose", "contract_ref", "period_from")
      VALUES
        ('Основная площадка (целевая зона РФ)',
         'Подлежит фиксации после выбора оператора ЦОД (открытый вопрос B.6)',
         'Российская Федерация, зона ru-central-1',
         'ru-central-1',
         'compute',
         NULL,
         CURRENT_DATE);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_order_offer_logs_protect" ON "order_offer_logs";`,
    );
    const immutableTables = [
      'order_status_logs',
      'admin_audit_logs',
      'regulatory_disclosures',
      'auth_event_logs',
      'taxi_registry_checks',
      'placement_site_logs',
    ];
    for (const table of immutableTables) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_${table}_immutable" ON "${table}";`);
    }
    await queryRunner.query(`DROP FUNCTION IF EXISTS nurtaxi_protect_offer_log();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS nurtaxi_forbid_journal_mutation();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS nurtaxi_journal_purge_allowed();`);

    await queryRunner.query(`DROP TABLE IF EXISTS "app_settings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "retention_purge_runs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_outbox";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "taxi_registry_checks";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_event_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "regulatory_disclosures";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "regulatory_exports";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "placement_site_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "placement_subcontractors";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "placement_components";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "placement_sites";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_track_points";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_offer_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_assignments";`);

    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "fk_orders_permit";`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "fk_orders_carrier";`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "fk_orders_vehicle";`);
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "fk_vehicles_current_permit";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "taxi_permits";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "carriers";`);

    await queryRunner.query(`
      ALTER TABLE "trip_recordings" DROP CONSTRAINT "fk_trip_recordings_order";
      ALTER TABLE "trip_recordings"
        ADD CONSTRAINT "fk_trip_recordings_order"
        FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE "order_routes" DROP CONSTRAINT "fk_order_routes_order";
      ALTER TABLE "order_routes"
        ADD CONSTRAINT "fk_order_routes_order"
        FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE "order_status_logs" DROP CONSTRAINT "fk_order_status_logs_order";
      ALTER TABLE "order_status_logs"
        ADD CONSTRAINT "fk_order_status_logs_order"
        FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`ALTER TABLE "admin_audit_logs" DROP COLUMN IF EXISTS "new_value";`);
    await queryRunner.query(
      `ALTER TABLE "admin_audit_logs" DROP COLUMN IF EXISTS "previous_value";`,
    );
    await queryRunner.query(`ALTER TABLE "admin_audit_logs" DROP COLUMN IF EXISTS "result";`);
    await queryRunner.query(`ALTER TABLE "admin_audit_logs" DROP COLUMN IF EXISTS "user_agent";`);
    await queryRunner.query(`ALTER TABLE "regions" DROP COLUMN IF EXISTS "compliance_config";`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "current_permit_id";`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "vin";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_trip_ended";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_orders_public_number";`);
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "permit_id",
        DROP COLUMN IF EXISTS "carrier_id",
        DROP COLUMN IF EXISTS "vehicle_id",
        DROP COLUMN IF EXISTS "completeness_status",
        DROP COLUMN IF EXISTS "trip_ended_at",
        DROP COLUMN IF EXISTS "trip_started_at",
        DROP COLUMN IF EXISTS "assignment_snapshot",
        DROP COLUMN IF EXISTS "public_number";
    `);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "order_public_number_seq";`);

    await this.recreateEnum(
      queryRunner,
      'provider_type_enum',
      ['payment', 'sms', 'maps'],
      [{ table: 'provider_configs', column: 'type' }],
    );
    await this.recreateEnum(
      queryRunner,
      'users_role_enum',
      ['client', 'driver', 'operator', 'regional_admin', 'super_admin'],
      [{ table: 'users', column: 'role' }],
    );
  }

  private async recreateEnum(
    queryRunner: QueryRunner,
    name: string,
    values: string[],
    columns: Array<{ table: string; column: string }>,
  ): Promise<void> {
    const oldName = `${name}_old`;
    const defaults: Array<{ table: string; column: string; value: string | null }> = [];

    for (const col of columns) {
      const rows: Array<{ column_default: string | null }> = await queryRunner.query(
        `
          SELECT column_default
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = $1
            AND column_name = $2
        `,
        [col.table, col.column],
      );
      const raw = rows[0]?.column_default ?? null;
      const match = raw?.match(/^'((?:\\'|[^'])*)'/);
      defaults.push({ ...col, value: match ? match[1].replace(/\\'/g, "'") : null });
      if (raw) {
        await queryRunner.query(
          `ALTER TABLE "${col.table}" ALTER COLUMN "${col.column}" DROP DEFAULT`,
        );
      }
    }

    await queryRunner.query(`ALTER TYPE "${name}" RENAME TO "${oldName}";`);
    await queryRunner.query(
      `CREATE TYPE "${name}" AS ENUM (${values.map((v) => `'${v}'`).join(', ')});`,
    );
    for (const col of columns) {
      await queryRunner.query(`
        ALTER TABLE "${col.table}"
          ALTER COLUMN "${col.column}" TYPE "${name}"
          USING "${col.column}"::text::"${name}";
      `);
    }
    await queryRunner.query(`DROP TYPE "${oldName}";`);

    for (const col of defaults) {
      if (col.value === null) continue;
      const escaped = col.value.replace(/'/g, "''");
      await queryRunner.query(
        `ALTER TABLE "${col.table}" ALTER COLUMN "${col.column}" SET DEFAULT '${escaped}'`,
      );
    }
  }
}
