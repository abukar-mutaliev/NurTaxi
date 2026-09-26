import { formatPhone, normalizePhone } from '@nurtaxi/shared-core/shared/lib';

/**
 * Пожелания к заказу: детское кресло, поездка для другого, комментарий.
 *
 * На новом API поля приходят отдельно. Пока сервер их не знает, клиент складывает
 * их в `comment` префиксом — водитель всё равно должен это увидеть.
 */

export interface OrderExtrasSource {
  childSeat?: boolean | null;
  passengerName?: string | null;
  passengerPhone?: string | null;
  comment?: string | null;
}

export interface OrderExtrasView {
  childSeat: boolean;
  passengerName: string | null;
  passengerPhone: string | null;
  comment: string | null;
}

const CHILD_SEAT_PREFIX = 'Детское кресло';
const PASSENGER_RE = /^Пассажир:\s*([^.,]+?)(?:\s*,\s*(\+7[\d\s()-]+))?(?:\.\s*|$)/u;

function parseLegacyComment(comment: string): Omit<OrderExtrasView, 'comment'> & { rest: string } {
  let rest = comment.trim();
  let childSeat = false;
  let passengerName: string | null = null;
  let passengerPhone: string | null = null;

  if (rest === CHILD_SEAT_PREFIX || rest.startsWith(`${CHILD_SEAT_PREFIX}.`)) {
    childSeat = true;
    rest = rest.slice(CHILD_SEAT_PREFIX.length).replace(/^\.\s*/, '');
  }

  const passenger = rest.match(PASSENGER_RE);
  if (passenger) {
    passengerName = passenger[1]?.trim() || null;
    const rawPhone = passenger[2]?.trim();
    passengerPhone = rawPhone ? normalizePhone(rawPhone) : null;
    rest = rest.slice(passenger[0].length).replace(/^\.\s*/, '');
  }

  return { childSeat, passengerName, passengerPhone, rest };
}

export function resolveOrderExtras(source: OrderExtrasSource): OrderExtrasView {
  const parsed = parseLegacyComment(source.comment ?? '');
  const passengerPhone = source.passengerPhone?.trim() || parsed.passengerPhone;

  return {
    childSeat: Boolean(source.childSeat) || parsed.childSeat,
    passengerName: source.passengerName?.trim() || parsed.passengerName,
    passengerPhone: passengerPhone ? normalizePhone(passengerPhone) : null,
    comment: parsed.rest || null,
  };
}

export function hasOrderExtras(extras: OrderExtrasView): boolean {
  return extras.childSeat || Boolean(extras.passengerName) || Boolean(extras.comment);
}

export function formatPassengerPhone(phone: string | null): string | null {
  if (!phone) {
    return null;
  }
  return formatPhone(phone);
}
