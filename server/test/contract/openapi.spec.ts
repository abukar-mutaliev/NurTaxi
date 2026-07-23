import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../../src/app.module';
import { shouldRunE2e } from '../helpers/run-e2e';

/**
 * Контрактные тесты OpenAPI (Req §25): ключевые пути MVP присутствуют в спецификации.
 */
const describeContract = shouldRunE2e() ? describe : describe.skip;

describeContract('OpenAPI contract', () => {
  it('содержит критические эндпоинты MVP', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();

    const config = new DocumentBuilder()
      .setTitle('Nur Taxi API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const paths = Object.keys(document.paths ?? {});

    const requiredPaths = [
      '/auth/otp/request',
      '/auth/otp/verify',
      '/orders/estimate',
      '/orders',
      '/orders/{id}/sos',
      '/driver/orders/{id}/accept',
      '/admin/tariffs',
      '/health/live',
      '/health/ready',
      '/me/notifications',
    ];

    for (const path of requiredPaths) {
      expect(paths).toContain(path);
    }

    await app.close();
  });
});
