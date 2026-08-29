import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Notification } from './entities/notification.entity';
import { PushDeviceToken } from './entities/push-device-token.entity';
import { NotificationsService } from './notifications.service';
import { NotificationEventListener } from './notification-event.listener';
import { NotificationsController } from './notifications.controller';
import { PushTokensController } from './push-tokens.controller';
import { PushTokensService } from './push-tokens.service';
import { StubPushProvider } from './push/stub-push.provider';
import { HttpPushProvider } from './push/http-push.provider';
import { PUSH_PROVIDER } from './push/push-provider.interface';

/**
 * Notifications (Des §2.3, §10): push (FCM/APNs), SMS, in-app; шаблоны и настройки;
 * подписка на доменные события.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushDeviceToken]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController, PushTokensController],
  providers: [
    NotificationsService,
    PushTokensService,
    NotificationEventListener,
    StubPushProvider,
    HttpPushProvider,
    {
      provide: PUSH_PROVIDER,
      useFactory: (http: HttpPushProvider, stub: StubPushProvider) =>
        process.env.PUSH_ENDPOINT ? http : stub,
      inject: [HttpPushProvider, StubPushProvider],
    },
  ],
  exports: [NotificationsService, PushTokensService],
})
export class NotificationsModule {}
