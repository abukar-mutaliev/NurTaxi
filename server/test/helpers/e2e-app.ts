import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { VALIDATION_PIPE_OPTIONS } from '../../src/common/validation/validation-exception';

/**
 * Создаёт Nest-приложение для e2e с тем же префиксом и пайпами, что и production.
 */
export async function createE2eApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1', { exclude: ['metrics'] });
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  await app.init();
  return app;
}
