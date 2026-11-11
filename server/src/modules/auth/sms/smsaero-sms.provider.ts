import { Logger } from '@nestjs/common';
import type { SmsProvider } from './sms-provider.interface';
import type { SmsAeroClient } from './smsaero.client';

/**
 * Боевая доставка SMS через SMS Aero (`sms/send`): коды вне Mobile ID,
 * SOS и приглашения в семейный аккаунт.
 */
export class SmsAeroSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SmsProvider(smsaero)');

  constructor(private readonly client: SmsAeroClient) {}

  async sendCode(phone: string, code: string): Promise<void> {
    // Бесплатное имя отправителя требует указать источник сообщения.
    await this.sendMessage(phone, `Nur Taxi: код подтверждения ${code}`);
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    await this.client.sendSms(phone, message);
    this.logger.log(`SMS поставлено в очередь для ${maskPhone(phone)}`);
  }
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `***${phone.slice(-4)}` : '***';
}
