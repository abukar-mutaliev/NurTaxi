import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { DriversModule } from '../drivers/drivers.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SosEvent } from './entities/sos-event.entity';
import { SosService } from './sos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SosEvent]),
    AuthModule,
    UsersModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => DriversModule),
    forwardRef(() => RealtimeModule),
  ],
  providers: [SosService],
  exports: [SosService],
})
export class SosModule {}
