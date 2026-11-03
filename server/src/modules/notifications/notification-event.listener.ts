import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../messaging/event-bus.service';
import { FREE_WAITING_SECONDS, WAITING_PRICE_PER_MINUTE } from '../orders/waiting';
import { NotificationsService } from './notifications.service';
import { getOrderStatusLabelRu } from './notification-templates';

@Injectable()
export class NotificationEventListener implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    const events = [
      'order.driver_assigned',
      'order.status_changed',
      'order.cancelled',
      'payment.completed',
      'payment.failed',
      'document.verified',
      'promo.redeemed',
    ] as const;

    for (const event of events) {
      this.eventBus.subscribeLocal(event, (payload) => this.handle(event, payload));
    }
  }

  private async handle(eventType: string, payload: unknown): Promise<void> {
    const data = payload as Record<string, unknown>;
    const userId = this.resolveUserId(eventType, data);
    if (!userId) return;

    await this.notifications.notifyUser({
      userId,
      eventType,
      data,
      bodyOverride: this.bodyFor(eventType, data),
    });
  }

  private resolveUserId(eventType: string, data: Record<string, unknown>): string | null {
    if (eventType === 'document.verified') {
      return typeof data.userId === 'string' ? data.userId : null;
    }
    if (eventType === 'promo.redeemed') {
      return typeof data.userId === 'string' ? data.userId : null;
    }
    return typeof data.clientId === 'string' ? data.clientId : null;
  }

  private bodyFor(eventType: string, data: Record<string, unknown>): string | undefined {
    if (eventType === 'order.status_changed' && typeof data.toStatus === 'string') {
      if (data.toStatus === 'driver_arrived') {
        const freeMinutes = FREE_WAITING_SECONDS / 60;
        return (
          `Водитель на месте. ${freeMinutes} минут бесплатно, ` +
          `дальше ${WAITING_PRICE_PER_MINUTE} ₽ за каждую минуту`
        );
      }
      return getOrderStatusLabelRu(data.toStatus);
    }
    if (eventType === 'payment.completed' && typeof data.amount === 'number') {
      return `Списано ${data.amount} ${data.currency ?? 'RUB'}`;
    }
    return undefined;
  }
}
