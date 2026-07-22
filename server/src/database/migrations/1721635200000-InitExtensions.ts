import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Базовая миграция фундамента (Фаза 0).
 * Включает расширения PostgreSQL, необходимые всей системе:
 * - postgis        — гео-запросы для матчинга и границ городов (Des §6, §7);
 * - pgcrypto       — генерация UUID (gen_random_uuid) для первичных ключей (Des §13).
 *
 * Доменные таблицы создаются миграциями соответствующих фаз.
 */
export class InitExtensions1721635200000 implements MigrationInterface {
  name = 'InitExtensions1721635200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis";`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "postgis";`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto";`);
  }
}
