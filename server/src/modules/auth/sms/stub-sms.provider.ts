import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './sms-provider.interface';

/**
 * Заглушка SMS-провайдера для dev/MVP: код не отправляется реально, а пишется в лог
 * (в dev-режиме) для удобства тестирования. В проде заменяется реальным адаптером
 * через ProviderConfig региона (Des §4.3).
 */
@Injectable()
export class StubSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SmsProvider(stub)');

  async sendCode(phone: string, code: string): Promise<void> {
    await this.sendMessage(phone, `Nur Taxi: код подтверждения ${code}`);
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(`Попытка отправить SMS через заглушку в production на ${this.mask(phone)}`);
      return;
    }
    this.logger.debug(`[DEV] SMS для ${this.mask(phone)}: ${message}`);
  }

  private mask(phone: string): string {
    return phone.length > 4 ? `***${phone.slice(-4)}` : '***';
  }
}
