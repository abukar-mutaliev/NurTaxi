import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * После отклонения водитель может заменить фото. Флаг нужен админке: статус снова
 * `pending`, но модератору важно видеть, что это повторная загрузка, а не первый файл.
 */
export class DocumentReplacedAfterRejection1723000000000 implements MigrationInterface {
  name = 'DocumentReplacedAfterRejection1723000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "driver_documents"
        ADD COLUMN IF NOT EXISTS "replaced_after_rejection" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "driver_documents"
        DROP COLUMN IF EXISTS "replaced_after_rejection"
    `);
  }
}
