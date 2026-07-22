import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { buildLoggerConfig } from './observability/logger.config';
import { MetricsModule } from './observability/metrics/metrics.module';
import { HttpMetricsInterceptor } from './observability/metrics/http-metrics.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';

// Доменные модули (границы согласно Des §2.3).
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { GeoModule } from './modules/geo/geo.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule.forRoot(buildLoggerConfig()),
    // Базовый rate limiting (защита от перебора, Req §20). Точечные лимиты OTP
    // задаются на эндпоинтах через @Throttle + логика в OtpService.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    MetricsModule,
    DatabaseModule,
    RedisModule,
    MessagingModule,
    HealthModule,

    // Доменные модули
    AuthModule,
    UsersModule,
    DriversModule,
    GeoModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
    AdminModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
