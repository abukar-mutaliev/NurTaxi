import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationEventListener } from './notification-event.listener';
import { NotificationsController } from './notifications.controller';
import { StubPushProvider } from './push/stub-push.provider';
import { PUSH_PROVIDER } from './push/push-provider.interface';

/**
 * Notifications (Des §2.3, §10): push (FCM/APNs), SMS, in-app; шаблоны и настройки;
 * подписка на доменные события.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationEventListener,
    StubPushProvider,
    { provide: PUSH_PROVIDER, useExisting: StubPushProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
