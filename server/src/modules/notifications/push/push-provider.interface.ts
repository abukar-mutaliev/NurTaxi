export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** Адаптер push (FCM/APNs). Конкретная реализация — по региону (Фаза 7+). */
export interface PushProvider {
  send(userId: string, message: PushMessage): Promise<void>;
}
