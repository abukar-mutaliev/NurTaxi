import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from '../regions/entities/region.entity';
import { City } from '../regions/entities/city.entity';
import { Tariff } from '../tariffs/entities/tariff.entity';
import { TariffsModule } from '../tariffs/tariffs.module';
import { RegionsModule } from '../regions/regions.module';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { UsersModule } from '../users/users.module';
import { DriversModule } from '../drivers/drivers.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProviderConfig } from './entities/provider-config.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { Review } from '../reviews/entities/review.entity';
import { OrderStatusLog } from '../orders/entities/order-status-log.entity';
import { AdminScopeModule } from './admin-scope.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditInterceptor } from './interceptors/admin-audit.interceptor';
import { AdminRegionsService } from './admin-regions.service';
import { AdminTariffsService } from './admin-tariffs.service';
import { AdminProvidersService } from './admin-providers.service';
import { AdminStaffService } from './admin-staff.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminRegionsController } from './controllers/admin-regions.controller';
import { AdminTariffsController } from './controllers/admin-tariffs.controller';
import { AdminProvidersController } from './controllers/admin-providers.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AdminStaffController } from './controllers/admin-staff.controller';
import { AdminDriversController } from './controllers/admin-drivers.controller';
import { AdminComplaintsController } from './controllers/admin-complaints.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminComplaintsService } from './admin-complaints.service';

/**
 * Admin & Regions (Des §2.3, §4): регионы, города, тарифы, провайдеры,
 * feature-флаги, изоляция по region_id, операторская консоль.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Region,
      City,
      Tariff,
      ProviderConfig,
      User,
      Order,
      Payment,
      DriverProfile,
      AdminAuditLog,
      Review,
      OrderStatusLog,
    ]),
    TariffsModule,
    RegionsModule,
    UsersModule,
    DriversModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => PaymentsModule),
    AdminScopeModule,
  ],
  controllers: [
    AdminRegionsController,
    AdminTariffsController,
    AdminProvidersController,
    AdminOrdersController,
    AdminAnalyticsController,
    AdminStaffController,
    AdminDriversController,
    AdminComplaintsController,
    AdminAuditController,
  ],
  providers: [
    AdminAuditService,
    { provide: APP_INTERCEPTOR, useClass: AdminAuditInterceptor },
    AdminRegionsService,
    AdminTariffsService,
    AdminProvidersService,
    AdminStaffService,
    AdminOrdersService,
    AdminAnalyticsService,
    AdminComplaintsService,
  ],
  exports: [AdminScopeModule],
})
export class AdminModule {}
