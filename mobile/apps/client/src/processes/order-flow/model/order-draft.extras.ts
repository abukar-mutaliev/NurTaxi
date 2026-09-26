import { isValidPhone, normalizePhone } from '@nurtaxi/shared-core/shared/lib';
import type { CreateOrderPayload } from '@nurtaxi/shared-core/shared/model';

import type { OrderDraftState } from './order-draft.slice';

export type OrderExtrasPayload = Pick<
  CreateOrderPayload,
  'comment' | 'childSeat' | 'passengerName' | 'passengerPhone' | 'familyMemberId'
>;

/** «Заказать другому» нельзя отправить без имени и валидного телефона пассажира. */
export function canSubmitOrderExtras(draft: OrderDraftState): boolean {
  if (!draft.orderForOther) {
    return true;
  }
  return draft.passengerName.trim().length >= 2 && isValidPhone(draft.passengerPhone);
}

export function extrasFromDraft(draft: OrderDraftState): OrderExtrasPayload {
  if (!draft.orderForOther) {
    return {
      comment: draft.comment.trim() || undefined,
      childSeat: draft.childSeat,
    };
  }

  return {
    comment: draft.comment.trim() || undefined,
    childSeat: draft.childSeat,
    passengerName: draft.passengerName.trim() || undefined,
    passengerPhone: isValidPhone(draft.passengerPhone)
      ? normalizePhone(draft.passengerPhone)
      : undefined,
    familyMemberId: draft.familyMemberId ?? undefined,
  };
}
