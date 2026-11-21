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
import { HttpPushProvider } from './push/http-push.provider';
import { ExpoPushProvider } from './push/expo-push.provider';
import { PUSH_PROVIDER } from './push/push-provider.interface';

/**
 * Notifications (Des §2.3, §10): push (Expo → FCM), SMS, in-app; шаблоны и настройки;
 * подписка на доменные события. Свой шлюз подключается через PUSH_ENDPOINT.
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
    HttpPushProvider,
    ExpoPushProvider,
    {
      provide: PUSH_PROVIDER,
      useFactory: (expo: ExpoPushProvider, http: HttpPushProvider) => {
        const endpoint = process.env.PUSH_ENDPOINT?.trim();
        // Приложения отдают Expo-токен. Свой шлюз — только если задан и это не Expo.
        if (endpoint && !endpoint.includes('exp.host')) {
          return http;
        }
        return expo;
      },
      inject: [ExpoPushProvider, HttpPushProvider],
    },
  ],
  exports: [NotificationsService, PushTokensService],
})
export class NotificationsModule {}
