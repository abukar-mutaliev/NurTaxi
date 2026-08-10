import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../messaging/event-bus.service';
import { RealtimeBroadcastService } from './realtime-broadcast.service';
import { RealtimeEvent } from './realtime.constants';

/**
 * Доставка доменных событий в комнаты операторов (Des §10, W10).
 */
@Injectable()
export class RealtimeStaffBridge implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly broadcast: RealtimeBroadcastService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribeLocal('payment.failed', (payload) => {
      void this.handlePaymentFailed(payload);
    });
    this.eventBus.subscribeLocal('document.verified', (payload) => {
      void this.handleDocumentVerified(payload);
    });
  }

  private async handlePaymentFailed(payload: unknown): Promise<void> {
    const data = payload as Record<string, unknown>;
    const regionId = typeof data.regionId === 'string' ? data.regionId : null;
    await this.broadcast.publishToStaff(regionId, RealtimeEvent.PaymentFailed, data);
  }

  private async handleDocumentVerified(payload: unknown): Promise<void> {
    const data = payload as Record<string, unknown>;
    const regionId = typeof data.regionId === 'string' ? data.regionId : null;
    await this.broadcast.publishToStaff(regionId, RealtimeEvent.DocumentVerified, data);
  }
}
