import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

/**
 * Валидация критичных переменных окружения на старте приложения.
 * Приложение не должно подниматься с некорректной конфигурацией (fail-fast).
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  PORT?: number;

  @IsString()
  DB_HOST!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  DB_PORT!: number;

  @IsString()
  DB_USERNAME!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_DATABASE!: string;

  @IsString()
  REDIS_HOST!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  REDIS_PORT!: number;

  @IsString()
  NATS_URL!: string;

  @IsBooleanString()
  @IsOptional()
  OTEL_ENABLED?: string;
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Некорректная конфигурация окружения:\n${details}`);
  }

  return config;
}
