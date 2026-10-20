/**
 * Заказ на сервере, который ещё не знает новых полей.
 *
 * API включает `forbidNonWhitelisted`: незнакомое поле — 400 «Проверьте правильность
 * заполнения полей». Остановки (`stops`) и пожелания к заказу появлялись в приложении раньше,
 * чем на боевом сервере, поэтому заказ отправляется так, как сервер умеет: сначала новыми
 * полями, а при отказе — текстом в комментарии водителю.
 */
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import type { CreateOrderPayload, GeoLocation, Order } from '@nurtaxi/shared-core/shared/model';

import {
  extrasFromDraft,
  isUnknownOrderExtrasError,
  type OrderExtrasPayload,
} from './order-draft.extras';
import type { OrderDraftState } from './order-draft.slice';

interface ApiErrorLike {
  fields?: Record<string, string>;
  details?: unknown;
  message?: string;
}

/** 400 whitelist: сервер ещё не принимает остановки. */
export function isUnknownOrderStopsError(error: ApiErrorLike): boolean {
  const keys = Object.keys(error.fields ?? {});
  if (keys.some((key) => key === 'stops' || /^stops[.[]/.test(key))) {
    return true;
  }
  const raw = `${error.message ?? ''} ${JSON.stringify(error.details ?? '')}`;
  return /property stops should not exist/i.test(raw) || /"stops"/.test(raw);
}

/** Остановки текстом для водителя, пока сервер не принимает поле `stops`. */
export function stopsCommentLine(stops: GeoLocation[] | undefined): string {
  const addresses = (stops ?? [])
    .map((stop) => stop.address?.trim())
    .filter((address): address is string => Boolean(address));
  return addresses.length > 0 ? `Остановка по пути: ${addresses.join('; ')}` : '';
}

function prependLine(comment: string | undefined, line: string): string | undefined {
  if (!line) {
    return comment;
  }
  return comment ? `${line}. ${comment}` : line;
}

/**
 * Сервер ответил, что остановок не знает: дальше в этой сессии не тратим на них запрос.
 * После обновления сервера флаг сбросит перезапуск приложения.
 */
let serverRejectsStops = false;

export function serverAcceptsStops(): boolean {
  return !serverRejectsStops;
}

export function markStopsUnsupported(): void {
  serverRejectsStops = true;
}

export type OrderBasePayload = Omit<CreateOrderPayload, 'stops' | keyof OrderExtrasPayload>;

/**
 * Создаёт заказ, отступая на текстовые поля, если сервер не знает `stops` или пожеланий.
 * Каждый отказ переводит в запасной режим только «свою» часть заказа.
 */
export async function createOrderCompat(
  create: (payload: CreateOrderPayload) => Promise<Order>,
  base: OrderBasePayload,
  draft: OrderDraftState,
  stops: GeoLocation[] | undefined,
): Promise<Order> {
  let stopsAsField = Boolean(stops?.length) && serverAcceptsStops();
  let extrasMode: 'structured' | 'legacy' = 'structured';

  for (;;) {
    const extras = extrasFromDraft(draft, extrasMode);
    const payload: CreateOrderPayload = stopsAsField
      ? { ...base, ...extras, stops }
      : { ...base, ...extras, comment: prependLine(extras.comment, stopsCommentLine(stops)) };

    try {
      return await create(payload);
    } catch (cause) {
      const appError = toAppError(cause as never);
      if (stopsAsField && isUnknownOrderStopsError(appError)) {
        markStopsUnsupported();
        stopsAsField = false;
        continue;
      }
      if (extrasMode === 'structured' && isUnknownOrderExtrasError(appError)) {
        extrasMode = 'legacy';
        continue;
      }
      throw cause;
    }
  }
}
