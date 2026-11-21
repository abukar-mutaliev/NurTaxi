export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushMessage {
  title: string;
  body: string;
  /** Только обезличенный eventId (FZ-02.4). ФИО, телефон и адрес сюда не кладутся. */
  data?: Record<string, string>;
  /** Секунды, после которых пуш можно не показывать. У предложения заказа — 30. */
  ttlSeconds?: number;
  /** Android-канал из приложения: `orders` или `promo`. */
  channelId?: 'orders' | 'promo';
}

/** Адаптер push (FCM/APNs). Конкретная реализация — по региону (Фаза 7+). */
export interface PushProvider {
  send(userId: string, message: PushMessage): Promise<void>;
}
