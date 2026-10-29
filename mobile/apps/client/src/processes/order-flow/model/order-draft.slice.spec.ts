import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';

import {
  activeOrderChanged,
  childSeatChanged,
  commentChanged,
  draftStops,
  dropoffSelected,
  orderDraftDiscarded,
  orderDraftReducer,
  orderDraftCleared,
  orderForOtherChanged,
  paymentMethodSelected,
  pickupSelected,
  regionSelected,
  selectOrderStop,
  stopSelected,
} from './order-draft.slice';

describe('stopSelected', () => {
  const stop = { lat: 43.19, lng: 44.79, address: 'ул. Московская, 1' };

  it('добавляет остановку, сбрасывает расчёт и убирается по null', () => {
    const withStop = orderDraftReducer(undefined, stopSelected(stop));
    expect(withStop.stop).toEqual(stop);
    expect(withStop.estimate).toBeNull();
    expect(draftStops(withStop.stop)).toEqual([stop]);

    const cleared = orderDraftReducer(withStop, stopSelected(null));
    expect(cleared.stop).toBeNull();
    expect(draftStops(cleared.stop)).toBeUndefined();
  });

  it('стирается вместе с черновиком после заказа', () => {
    const withStop = orderDraftReducer(undefined, stopSelected(stop));
    expect(orderDraftReducer(withStop, orderDraftCleared()).stop).toBeNull();
  });

  it('читает черновик прежней версии без поля остановки', () => {
    // Состояние Redux заморожено — «старый» черновик собираем копией без поля.
    const { stop: _absent, ...legacy } = orderDraftReducer(undefined, { type: 'init' });
    expect(selectOrderStop({ orderDraft: legacy })).toBeNull();
  });
});

describe('pickupSelected', () => {
  const pickup = {
    lat: 43.2167,
    lng: 44.7667,
    address: 'Моё местоположение',
  };

  it('не создаёт новый стейт, если точка подачи уже та же', () => {
    const withPickup = orderDraftReducer(undefined, pickupSelected(pickup));
    const again = orderDraftReducer(withPickup, pickupSelected({ ...pickup }));

    expect(again).toBe(withPickup);
  });

  it('обновляет координаты при реальном сдвиге', () => {
    const withPickup = orderDraftReducer(undefined, pickupSelected(pickup));
    const moved = orderDraftReducer(
      withPickup,
      pickupSelected({
        lat: 43.22,
        lng: 44.77,
        address: 'Моё местоположение',
      }),
    );

    expect(moved).not.toBe(withPickup);
    expect(moved.pickup).toEqual({
      lat: 43.22,
      lng: 44.77,
      address: 'Моё местоположение',
    });
  });
});

describe('orderDraftDiscarded', () => {
  it('сбрасывает маршрут и пожелания, но оставляет регион, оплату и активный заказ', () => {
    const steps = [
      regionSelected('region-1'),
      pickupSelected({ lat: 43.2, lng: 44.7, address: 'пр. Мира, 1' }),
      stopSelected({ lat: 43.19, lng: 44.79, address: 'ул. Московская, 1' }),
      dropoffSelected({ lat: 43.1, lng: 44.6, address: 'Аэропорт' }),
      commentChanged('У второго подъезда'),
      childSeatChanged(true),
      paymentMethodSelected(PaymentMethod.Card),
      activeOrderChanged('order-1'),
    ];
    const filled = steps.reduce(orderDraftReducer, orderDraftReducer(undefined, { type: 'init' }));

    const discarded = orderDraftReducer(filled, orderDraftDiscarded());

    expect(discarded.pickup).toBeNull();
    expect(discarded.stop).toBeNull();
    expect(discarded.dropoff).toBeNull();
    expect(discarded.comment).toBe('');
    expect(discarded.childSeat).toBe(false);
    expect(discarded.regionId).toBe('region-1');
    expect(discarded.paymentMethod).toBe(PaymentMethod.Card);
    expect(discarded.activeOrderId).toBe('order-1');
  });
});

describe('order extras', () => {
  it('включает детское кресло', () => {
    const next = orderDraftReducer(undefined, childSeatChanged(true));
    expect(next.childSeat).toBe(true);
  });

  it('очищает пассажира при выключении «заказать другому»', () => {
    const withPassenger = orderDraftReducer(undefined, orderForOtherChanged(true));
    const filled = {
      ...withPassenger,
      passengerName: 'Амина',
      passengerPhone: '+7 (928) 123-45-67',
      familyMemberId: 'member-1',
    };
    const cleared = orderDraftReducer(filled, orderForOtherChanged(false));

    expect(cleared.orderForOther).toBe(false);
    expect(cleared.passengerName).toBe('');
    expect(cleared.passengerPhone).toBe('');
    expect(cleared.familyMemberId).toBeNull();
  });

  it('подставляет маску телефона при включении «заказать другому»', () => {
    const next = orderDraftReducer(undefined, orderForOtherChanged(true));
    expect(next.orderForOther).toBe(true);
    expect(next.passengerPhone).toBe('+7 ');
  });
});
