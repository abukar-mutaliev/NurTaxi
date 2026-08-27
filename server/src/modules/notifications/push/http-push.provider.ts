import { Injectable, Logger } from '@nestjs/common';
import { PushTokensService } from '../push-tokens.service';
import type { PushMessage, PushProvider } from './push-provider.interface';

/**
 * Канал push с подтверждённым размещением (FZ-02.4): на внешний endpoint
 * уходят только токен устройства и обезличенный eventId.
 */
@Injectable()
export class HttpPushProvider implements PushProvider {
  private readonly logger = new Logger(HttpPushProvider.name);

  constructor(private readonly pushTokens: PushTokensService) {}

  async send(userId: string, message: PushMessage): Promise<void> {
    const url = process.env.PUSH_ENDPOINT;
    if (!url) {
      throw new Error('PUSH_ENDPOINT не задан');
    }
    const tokens = await this.pushTokens.listForUser(userId);
    for (const record of tokens) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.PUSH_TOKEN ? { authorization: `Bearer ${process.env.PUSH_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          token: record.token,
          platform: record.platform,
          eventId: message.data?.eventId ?? '',
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) {
        this.logger.warn(`push HTTP ${response.status} for platform=${record.platform}`);
      }
    }
  }
}
