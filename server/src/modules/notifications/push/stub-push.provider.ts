import { Injectable, Logger } from '@nestjs/common';
import type { PushMessage, PushProvider } from './push-provider.interface';

@Injectable()
export class StubPushProvider implements PushProvider {
  private readonly logger = new Logger(StubPushProvider.name);

  async send(userId: string, message: PushMessage): Promise<void> {
    this.logger.log(`[STUB PUSH] user=${userId} title="${message.title}"`);
  }
}
