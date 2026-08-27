import { Injectable } from '@nestjs/common';
import type { RisChannel, RisTripPayload } from './ris-channel.interface';

/** Тестовый приёмник региональной ИС (FZ-07, C8.9 отложен до B.1). */
@Injectable()
export class StubRisChannel implements RisChannel {
  readonly received: RisTripPayload[] = [];

  async sendTrip(
    payload: RisTripPayload,
  ): Promise<{ accepted: boolean; response: Record<string, unknown> }> {
    this.received.push(payload);
    return { accepted: true, response: { stub: true, orderId: payload.orderId } };
  }
}
