import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Для CLI-миграций подхватываем .env напрямую (Nest ConfigModule здесь недоступен).
loadEnv();

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'nurtaxi',
  password: process.env.DB_PASSWORD ?? 'nurtaxi',
  database: process.env.DB_DATABASE ?? 'nurtaxi',
  ssl: toBool(process.env.DB_SSL) ? { rejectUnauthorized: false } : false,
  // Схема управляется исключительно миграциями (Des §14) — synchronize запрещён.
  synchronize: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'schema_migrations',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
