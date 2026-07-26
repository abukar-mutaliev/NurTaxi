/**
 * Ключи идемпотентности (`requirements.md §14.5`).
 *
 * Важно: сервер Nur Taxi принимает ключ **в теле запроса** (`idempotencyKey`) для
 * `POST /driver/payouts` и `POST /admin/orders/{id}/refund`, а не в HTTP-заголовке.
 * Заголовок `Idempotency-Key` мы всё равно отправляем на всех мутациях — он безвреден и
 * оставляет запас на случай, когда сервер начнёт его читать. Подробности расхождения —
 * `docs/mob.api-delta.md`.
 */

/** RFC 4122 v4 без внешних зависимостей: crypto.randomUUID есть в Hermes/RN 0.74+. */
export function createIdempotencyKey(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Добавляет ключ в тело мутации, если вызывающий код его не задал. */
export function withIdempotencyKey<T extends object>(body: T): T & { idempotencyKey: string } {
  const existing = (body as { idempotencyKey?: string }).idempotencyKey;
  return { ...body, idempotencyKey: existing ?? createIdempotencyKey() };
}
