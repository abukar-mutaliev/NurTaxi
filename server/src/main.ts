// OpenTelemetry и Sentry инициализируются ДО импорта NestJS и остального кода,
// чтобы авто-инструментация корректно перехватила библиотеки.
import { initTracing } from './observability/tracing';
import { initSentry } from './observability/sentry';

initTracing();
initSentry();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';
import { assertProductionSecurity, parseCorsOrigins } from './config/production-security';

assertProductionSecurity(process.env);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Структурированное логирование через pino.
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const appConfig = config.getOrThrow<AppConfig>('app');

  // helmet с CSP, совместимым со Swagger UI. Директиву upgrade-insecure-requests
  // отключаем, иначе браузер принудительно переводит http://localhost на https и
  // страница /api/docs не открывается по HTTP в dev.
  const isProd = appConfig.env === 'production' || appConfig.env === 'staging';

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );

  if (isProd) {
    app.use(
      (
        req: { headers: Record<string, string | string[] | undefined>; url: string },
        res: { redirect: (c: number, u: string) => void },
        next: () => void,
      ) => {
        const proto = req.headers['x-forwarded-proto'];
        if (proto === 'http') {
          res.redirect(308, `https://${req.headers.host}${req.url}`);
          return;
        }
        next();
      },
    );
  }

  const corsOrigin = parseCorsOrigins(appConfig.corsOrigins, appConfig.env);
  app.enableCors({ origin: corsOrigin, credentials: true });
  // Версия зашита в префикс (/api/v1) согласно Req §14. Отдельное URI-версионирование
  // Nest не включаем, чтобы не задваивать сегмент версии в пути.
  app.setGlobalPrefix(appConfig.apiPrefix, { exclude: ['metrics'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  // OpenAPI / Swagger (Req §14.5).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nur Taxi API')
    .setDescription('API платформы женского такси Nur Taxi')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(appConfig.port);

  const logger = app.get(Logger);
  logger.log(
    `Nur Taxi backend запущен: http://localhost:${appConfig.port}/${appConfig.apiPrefix} (env=${appConfig.env})`,
  );
}

void bootstrap();
