import { Injectable, Logger } from '@nestjs/common';
import { PushTokensService } from '../push-tokens.service';
import type { PushMessage, PushProvider } from './push-provider.interface';

@Injectable()
export class StubPushProvider implements PushProvider {
  private readonly logger = new Logger(StubPushProvider.name);

  constructor(private readonly pushTokens: PushTokensService) {}

  async send(userId: string, message: PushMessage): Promise<void> {
    const tokens = await this.pushTokens.listForUser(userId);
    if (tokens.length === 0) {
      this.logger.debug(`[STUB PUSH] user=${userId} — no device tokens`);
      return;
    }

    for (const record of tokens) {
      this.logger.log(
        `[STUB PUSH] user=${userId} platform=${record.platform} token=${record.token.slice(0, 12)}… title="${message.title}"`,
      );
    }
  }
}
