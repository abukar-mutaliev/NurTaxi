import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { SmsProvider } from './sms-provider.interface';
import {
  SmsAeroClient,
  SmsAeroRequestError,
  pickActiveSign,
} from './smsaero.client';

const SIGN_CACHE_MS = 10 * 60_000;

/**
 * Боевая доставка SMS через SMS Aero (`sms/send`): коды вне Mobile ID,
 * SOS и приглашения в семейный аккаунт.
 *
 * Имя из `SMSAERO_SIGN` используется, только если оно активно в кабинете.
 * Иначе берётся первое активное имя из `sign/list`.
 */
export class SmsAeroSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SmsProvider(smsaero)');
  private cachedSign: { value: string; until: number } | null = null;

  constructor(private readonly client: SmsAeroClient) {}

  async sendCode(phone: string, code: string): Promise<void> {
    // Бесплатное имя отправителя требует указать источник сообщения.
    await this.sendMessage(phone, `Nur Taxi: код подтверждения ${code}`);
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    const sign = await this.resolveSign();
    try {
      await this.deliver(phone, message, sign);
    } catch (error) {
      if (!isSignRejected(error)) throw this.asHttp(error);
      const other = await this.resolveSign(true);
      if (other !== sign) {
        try {
          await this.deliver(phone, message, other);
          return;
        } catch (retryError) {
          throw this.asHttp(retryError);
        }
      }
      throw this.asHttp(error);
    }
  }

  private async deliver(phone: string, message: string, sign: string): Promise<void> {
    await this.client.sendSms(phone, message, sign);
    this.logger.log(`SMS поставлено в очередь для ${maskPhone(phone)}, имя «${sign}»`);
  }

  private async resolveSign(force = false): Promise<string> {
    if (!force && this.cachedSign && this.cachedSign.until > Date.now()) {
      return this.cachedSign.value;
    }
    const preferred = this.client.configuredSign;
    try {
      const picked = pickActiveSign(await this.client.listSigns(), preferred);
      if (picked) {
        this.cachedSign = { value: picked, until: Date.now() + SIGN_CACHE_MS };
        if (picked !== preferred) {
          this.logger.warn(`Имя «${preferred}» неактивно, для SMS берём «${picked}»`);
        }
        return picked;
      }
      this.logger.warn(`В кабинете SMS Aero нет активного имени, пробуем «${preferred}»`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'неизвестная ошибка';
      this.logger.warn(`Не удалось получить список имён SMS Aero: ${reason}`);
    }
    return preferred;
  }

  private asHttp(error: unknown): ServiceUnavailableException {
    if (isSignRejected(error)) {
      this.logger.warn(error.message);
      return new ServiceUnavailableException({
        code: 'SMS_SIGN_REJECTED',
        message:
          'Имя отправителя SMS не активно в кабинете SMS Aero. Проверьте SMSAERO_SIGN и статус имени',
      });
    }
    if (error instanceof SmsAeroRequestError) {
      this.logger.warn(`SMS Aero ${error.httpStatus}: ${error.message}`);
    } else {
      this.logger.warn('SMS Aero не ответил');
    }
    return new ServiceUnavailableException({
      code: 'SMS_UNAVAILABLE',
      message: 'Не удалось отправить SMS. Попробуйте ещё раз',
    });
  }
}

function isSignRejected(error: unknown): error is SmsAeroRequestError {
  return error instanceof SmsAeroRequestError && /sign:/i.test(error.message);
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `***${phone.slice(-4)}` : '***';
}
