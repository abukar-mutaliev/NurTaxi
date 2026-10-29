/**
 * Черновик заказа — сквозной процесс оформления поездки (M4).
 *
 * Живёт в слое `processes`, потому что проходит через несколько экранов: выбор адресов на
 * карте → расчёт цены → выбор тарифа и оплаты → подтверждение. Сохраняется в redux-persist,
 * чтобы случайно закрытое приложение не стёрло уже введённые точки маршрута.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { isSameGeoLocation, toApiGeoLocation } from '@nurtaxi/shared-core/shared/lib';
import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import type { GeoLocation, OrderEstimate } from '@nurtaxi/shared-core/shared/model';

function normalizeGeoLocation(location: GeoLocation | null): GeoLocation | null {
  if (!location) {
    return null;
  }

  return toApiGeoLocation(location);
}

export interface OrderDraftState {
  regionId: string | null;
  pickup: GeoLocation | null;
  /**
   * Промежуточная остановка между подачей и точкой Б. В черновике, сохранённом прежней
   * версией приложения, поля нет — читать через `selectOrderStop`.
   */
  stop?: GeoLocation | null;
  dropoff: GeoLocation | null;
  tariffId: string | null;
  paymentMethod: PaymentMethod;
  comment: string;
  childSeat: boolean;
  /** Поездка для другого пассажира: имя и телефон, не обязательно член семьи. */
  orderForOther: boolean;
  passengerName: string;
  passengerPhone: string;
  /** Для заказа члену семьи (`M10.4`). */
  familyMemberId: string | null;
  /** Последний расчёт от сервера; сбрасывается при любом изменении маршрута. */
  estimate: OrderEstimate | null;
  /** Заказ, за которым сейчас следит приложение. */
  activeOrderId: string | null;
}

const initialState: OrderDraftState = {
  regionId: null,
  pickup: null,
  stop: null,
  dropoff: null,
  tariffId: null,
  paymentMethod: PaymentMethod.Cash,
  comment: '',
  childSeat: false,
  orderForOther: false,
  passengerName: '',
  passengerPhone: '',
  familyMemberId: null,
  estimate: null,
  activeOrderId: null,
};

export const orderDraftSlice = createSlice({
  name: 'orderDraft',
  initialState,
  reducers: {
    regionSelected(state, action: PayloadAction<string>) {
      state.regionId = action.payload;
    },
    pickupSelected(state, action: PayloadAction<GeoLocation | null>) {
      const next = normalizeGeoLocation(action.payload);
      if (isSameGeoLocation(state.pickup, next)) {
        return;
      }
      state.pickup = next;
      state.estimate = null;
    },
    dropoffSelected(state, action: PayloadAction<GeoLocation | null>) {
      const next = normalizeGeoLocation(action.payload);
      if (isSameGeoLocation(state.dropoff, next)) {
        return;
      }
      state.dropoff = next;
      state.estimate = null;
    },
    /** Остановка меняет маршрут и цену, поэтому сбрасывает расчёт, как и концы маршрута. */
    stopSelected(state, action: PayloadAction<GeoLocation | null>) {
      const next = normalizeGeoLocation(action.payload);
      if (isSameGeoLocation(state.stop ?? null, next)) {
        return;
      }
      state.stop = next;
      state.estimate = null;
    },
    routeReversed(state) {
      // Остановка в середине пути остаётся на месте — меняются только концы.
      const { pickup, dropoff } = state;
      state.pickup = dropoff;
      state.dropoff = pickup;
      state.estimate = null;
    },
    tariffSelected(state, action: PayloadAction<string | null>) {
      state.tariffId = action.payload;
      state.estimate = null;
    },
    paymentMethodSelected(state, action: PayloadAction<PaymentMethod>) {
      state.paymentMethod = action.payload;
    },
    commentChanged(state, action: PayloadAction<string>) {
      state.comment = action.payload;
    },
    childSeatChanged(state, action: PayloadAction<boolean>) {
      state.childSeat = action.payload;
    },
    orderForOtherChanged(state, action: PayloadAction<boolean>) {
      state.orderForOther = action.payload;
      if (!action.payload) {
        state.passengerName = '';
        state.passengerPhone = '';
        state.familyMemberId = null;
        return;
      }
      if (!state.passengerPhone.trim()) {
        state.passengerPhone = '+7 ';
      }
    },
    passengerNameChanged(state, action: PayloadAction<string>) {
      state.passengerName = action.payload;
    },
    passengerPhoneChanged(state, action: PayloadAction<string>) {
      state.passengerPhone = action.payload;
    },
    familyMemberSelected(state, action: PayloadAction<string | null>) {
      state.familyMemberId = action.payload;
    },
    estimateReceived(state, action: PayloadAction<OrderEstimate>) {
      state.estimate = action.payload;
      state.tariffId = action.payload.tariff.id;
    },
    activeOrderChanged(state, action: PayloadAction<string | null>) {
      state.activeOrderId = action.payload;
    },
    /** Вызывается после успешного создания заказа и после его завершения. */
    orderDraftCleared(state) {
      return { ...initialState, regionId: state.regionId, activeOrderId: state.activeOrderId };
    },
    /**
     * Клиент передумал до нажатия «Заказать»: маршрут и пожелания к поездке сбрасываются,
     * а способ оплаты остаётся — это привычка, а не часть отменённой поездки.
     */
    orderDraftDiscarded(state) {
      return {
        ...initialState,
        regionId: state.regionId,
        activeOrderId: state.activeOrderId,
        paymentMethod: state.paymentMethod,
      };
    },
  },
});

export const {
  regionSelected,
  pickupSelected,
  stopSelected,
  dropoffSelected,
  routeReversed,
  tariffSelected,
  paymentMethodSelected,
  commentChanged,
  childSeatChanged,
  orderForOtherChanged,
  passengerNameChanged,
  passengerPhoneChanged,
  familyMemberSelected,
  estimateReceived,
  activeOrderChanged,
  orderDraftCleared,
  orderDraftDiscarded,
} = orderDraftSlice.actions;

export const orderDraftReducer = orderDraftSlice.reducer;

export interface WithOrderDraftState {
  orderDraft: OrderDraftState;
}

export const selectOrderDraft = (state: WithOrderDraftState): OrderDraftState => state.orderDraft;

export const selectOrderStop = (state: WithOrderDraftState): GeoLocation | null =>
  state.orderDraft.stop ?? null;

/** Остановки черновика в формате запроса к API. */
export function draftStops(stop: GeoLocation | null | undefined): GeoLocation[] | undefined {
  return stop ? [toApiGeoLocation(stop)] : undefined;
}

/** Расчёт цены возможен, только когда заданы обе точки и регион. */
export const selectCanEstimate = (state: WithOrderDraftState): boolean => {
  const { regionId, pickup, dropoff } = state.orderDraft;
  return Boolean(regionId && pickup && dropoff);
};

export const selectActiveOrderId = (state: WithOrderDraftState): string | null =>
  state.orderDraft.activeOrderId;
