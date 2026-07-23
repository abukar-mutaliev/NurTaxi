import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeoModule } from '../geo/geo.module';
import { RegionsModule } from '../regions/regions.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { DriversModule } from '../drivers/drivers.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SosModule } from '../sos/sos.module';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { Receipt } from '../payments/entities/receipt.entity';
import { EmergencyContact } from '../users/entities/emergency-contact.entity';
import { Order } from './entities/order.entity';
import { OrderRoute } from './entities/order-route.entity';
import { OrderStatusLog } from './entities/order-status-log.entity';
import { OrdersService } from './orders.service';
import { OrderTransitionService } from './order-transition.service';
import { OrderTrackingService } from './order-tracking.service';
import { MatchingService } from './matching/matching.service';
import { OrdersController } from './orders.controller';
import { DriverOrdersController } from './driver-orders.controller';

/**
 * Orders & Matching (Des §2.3, §5, §6). Фазы 4–5.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderRoute, OrderStatusLog, EmergencyContact, Receipt]),
    GeoModule,
    RegionsModule,
    TariffsModule,
    forwardRef(() => DriversModule),
    UsersModule,
    forwardRef(() => RealtimeModule),
    forwardRef(() => SosModule),
    forwardRef(() => PaymentsModule),
    forwardRef(() => ReviewsModule),
  ],
  controllers: [OrdersController, DriverOrdersController],
  providers: [OrdersService, OrderTransitionService, OrderTrackingService, MatchingService],
  exports: [OrdersService, OrderTrackingService, OrderTransitionService, MatchingService],
})
export class OrdersModule {}
