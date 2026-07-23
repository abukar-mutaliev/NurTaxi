export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/**
 * Адаптер SMS-провайдера (Des §4.3). Конкретная реализация выбирается по
 * ProviderConfig региона в рантайме (Фаза 7). На MVP — заглушка.
 */
export interface SmsProvider {
  sendCode(phone: string, code: string): Promise<void>;
  /** Произвольное SMS (SOS, уведомления). */
  sendMessage(phone: string, message: string): Promise<void>;
}
