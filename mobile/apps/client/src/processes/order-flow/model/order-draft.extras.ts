import { formatPhone, isValidPhone, normalizePhone } from '@nurtaxi/shared-core/shared/lib';
import type { CreateOrderPayload } from '@nurtaxi/shared-core/shared/model';

import type { OrderDraftState } from './order-draft.slice';

export type OrderExtrasPayload = Pick<
  CreateOrderPayload,
  'comment' | 'childSeat' | 'passengerName' | 'passengerPhone' | 'familyMemberId'
>;

const EXTRAS_FIELDS = new Set(['childSeat', 'passengerName', 'passengerPhone']);

/** «Заказать другому» нельзя отправить без имени и валидного телефона пассажира. */
export function canSubmitOrderExtras(draft: OrderDraftState): boolean {
  if (!draft.orderForOther) {
    return true;
  }
  return draft.passengerName.trim().length >= 2 && isValidPhone(draft.passengerPhone);
}

function extrasCommentLine(draft: OrderDraftState): string {
  const parts: string[] = [];
  if (draft.childSeat) {
    parts.push('Детское кресло');
  }
  if (draft.orderForOther) {
    const name = draft.passengerName.trim();
    const phone = isValidPhone(draft.passengerPhone) ? formatPhone(draft.passengerPhone) : '';
    if (name && phone) {
      parts.push(`Пассажир: ${name}, ${phone}`);
    } else if (name) {
      parts.push(`Пассажир: ${name}`);
    }
  }
  return parts.join('. ');
}

function mergeExtrasComment(draft: OrderDraftState): string | undefined {
  const prefix = extrasCommentLine(draft);
  const comment = draft.comment.trim();
  if (!prefix) {
    return comment || undefined;
  }
  if (!comment) {
    return prefix;
  }
  return `${prefix}. ${comment}`;
}

/**
 * Пожелания к заказу.
 *
 * `structured` — отдельные поля API. `legacy` — текст в `comment`, если сервер ещё
 * не знает `childSeat` / пассажира (`forbidNonWhitelisted`).
 */
export function extrasFromDraft(
  draft: OrderDraftState,
  compatibility: 'structured' | 'legacy' = 'structured',
): OrderExtrasPayload {
  if (compatibility === 'legacy') {
    return {
      comment: mergeExtrasComment(draft),
      ...(draft.orderForOther && draft.familyMemberId
        ? { familyMemberId: draft.familyMemberId }
        : {}),
    };
  }

  const payload: OrderExtrasPayload = {
    comment: draft.comment.trim() || undefined,
  };
  if (draft.childSeat) {
    payload.childSeat = true;
  }
  if (!draft.orderForOther) {
    return payload;
  }

  const name = draft.passengerName.trim();
  if (name) {
    payload.passengerName = name;
  }
  if (isValidPhone(draft.passengerPhone)) {
    payload.passengerPhone = normalizePhone(draft.passengerPhone);
  }
  if (draft.familyMemberId) {
    payload.familyMemberId = draft.familyMemberId;
  }
  return payload;
}

/** 400 whitelist: сервер ещё не принимает поля пожеланий. */
export function isUnknownOrderExtrasError(error: {
  fields?: Record<string, string>;
  details?: unknown;
  message?: string;
}): boolean {
  const keys = Object.keys(error.fields ?? {});
  if (keys.some((key) => EXTRAS_FIELDS.has(key))) {
    return true;
  }
  const raw = `${error.message ?? ''} ${JSON.stringify(error.details ?? '')}`;
  return (
    /property (childSeat|passengerName|passengerPhone) should not exist/i.test(raw) ||
    /"(childSeat|passengerName|passengerPhone)"/.test(raw)
  );
}
