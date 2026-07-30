import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { DriversModule } from '../drivers/drivers.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeBroadcastService } from './realtime-broadcast.service';
import { WsSubscriptionService } from './ws-subscription.service';
import { WsAuthService } from './ws-auth.service';
import { RealtimeLocationBridge } from './realtime-location.bridge';
import { RealtimeStaffBridge } from './realtime-staff.bridge';

/**
 * WebSocket real-time (Des §10, Фаза 5).
 * Каналы client:/driver:/order: + Redis pub/sub для масштабирования.
 */
@Module({
  imports: [
    JwtModule.register({}),
    UsersModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => DriversModule),
  ],
  providers: [
    RealtimeGateway,
    RealtimeBroadcastService,
    WsSubscriptionService,
    WsAuthService,
    RealtimeLocationBridge,
    RealtimeStaffBridge,
  ],
  exports: [RealtimeBroadcastService, RealtimeLocationBridge],
})
export class RealtimeModule {}
