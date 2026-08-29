import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SMS_PROVIDER, type SmsProvider } from '../auth/sms/sms-provider.interface';
import { NotificationChannel } from '../../common/enums/phase8.enum';
import { Notification } from './entities/notification.entity';
import { getNotificationTemplate, isChannelEnabled } from './notification-templates';
import { PUSH_PROVIDER, type PushProvider } from './push/push-provider.interface';
import { sanitizePushData } from '../../common/compliance/push-payload';
import { UsersService } from '../users/users.service';

export interface NotifyUserOptions {
  userId: string;
  eventType: string;
  data?: Record<string, unknown>;
  titleOverride?: string;
  bodyOverride?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly usersService: UsersService,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async notifyUser(options: NotifyUserOptions): Promise<void> {
    const template = getNotificationTemplate(options.eventType);
    if (!template) {
      this.logger.debug(`No notification template for ${options.eventType}`);
      return;
    }

    const user = await this.usersService.getByIdOrThrow(options.userId);
    const title = options.titleOverride ?? template.title;
    const body = options.bodyOverride ?? template.body;
    const data = options.data ?? {};

    for (const channel of template.channels) {
      if (!isChannelEnabled(user.notificationSettings, channel)) continue;

      if (channel === 'in_app') {
        await this.notifications.save(
          this.notifications.create({
            userId: user.id,
            type: template.type,
            title,
            body,
            data,
            channel: NotificationChannel.InApp,
          }),
        );
      }

      if (channel === 'push') {
        await this.push.send(user.id, {
          title,
          body,
          data: sanitizePushData({ eventId: options.eventType, ...data }),
        });
      }

      if (channel === 'sms') {
        await this.sms.sendMessage(user.phone, `${title}: ${body}`);
      }
    }
  }

  listForUser(userId: string, limit = 50): Promise<Notification[]> {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(userId: string, notificationId: string): Promise<Notification> {
    const note = await this.notifications.findOne({ where: { id: notificationId, userId } });
    if (!note) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Уведомление не найдено',
      });
    }
    note.readAt = new Date();
    return this.notifications.save(note);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.update({ userId, readAt: IsNull() }, { readAt: new Date() });
  }

  unreadCount(userId: string): Promise<number> {
    return this.notifications.count({ where: { userId, readAt: IsNull() } });
  }
}
