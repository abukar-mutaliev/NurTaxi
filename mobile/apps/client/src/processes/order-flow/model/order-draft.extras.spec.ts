import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';

import { canSubmitOrderExtras, extrasFromDraft } from './order-draft.extras';
import type { OrderDraftState } from './order-draft.slice';

const draft: OrderDraftState = {
  regionId: 'region-1',
  pickup: { lat: 43.2, lng: 44.7, address: 'A' },
  dropoff: { lat: 43.3, lng: 44.8, address: 'B' },
  tariffId: null,
  paymentMethod: PaymentMethod.Cash,
  comment: '  код домофона 12  ',
  childSeat: true,
  orderForOther: false,
  passengerName: 'Амина',
  passengerPhone: '+7 (928) 123-45-67',
  familyMemberId: 'member-1',
  estimate: null,
  activeOrderId: null,
};

describe('extrasFromDraft', () => {
  it('не отправляет пассажира, пока выключено «заказать другому»', () => {
    expect(extrasFromDraft(draft)).toEqual({
      comment: 'код домофона 12',
      childSeat: true,
    });
  });

  it('включает имя, телефон и члена семьи для другого пассажира', () => {
    expect(extrasFromDraft({ ...draft, orderForOther: true })).toEqual({
      comment: 'код домофона 12',
      childSeat: true,
      passengerName: 'Амина',
      passengerPhone: '+79281234567',
      familyMemberId: 'member-1',
    });
  });
});

describe('canSubmitOrderExtras', () => {
  it('требует имя и телефон, если заказ для другого', () => {
    expect(canSubmitOrderExtras({ ...draft, orderForOther: true, passengerName: '' })).toBe(false);
    expect(canSubmitOrderExtras({ ...draft, orderForOther: true })).toBe(true);
    expect(canSubmitOrderExtras(draft)).toBe(true);
  });
});
