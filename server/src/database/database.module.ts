import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DatabaseConfig } from '../config/configuration';

/**
 * Подключение к PostgreSQL + PostGIS.
 * Схема управляется только миграциями; авто-синхронизация запрещена (Des §14).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<DatabaseConfig>('database');
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
          synchronize: false,
          autoLoadEntities: true,
          migrationsTableName: 'schema_migrations',
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: db.runMigrations,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
