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
    if (process.env.NODE_ENV === 'production') {
      // В проде заглушка не должна использоваться — сигнализируем об ошибке конфигурации.
      this.logger.error(`Попытка отправить SMS через заглушку в production на ${this.mask(phone)}`);
      return;
    }
    this.logger.debug(`[DEV] Код для ${this.mask(phone)}: ${code}`);
  }

  private mask(phone: string): string {
    return phone.length > 4 ? `***${phone.slice(-4)}` : '***';
  }
}
