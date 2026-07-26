/**
 * Черновик заказа — сквозной процесс оформления поездки (M4).
 *
 * Живёт в слое `processes`, потому что проходит через несколько экранов: выбор адресов на
 * карте → расчёт цены → выбор тарифа и оплаты → подтверждение. Сохраняется в redux-persist,
 * чтобы случайно закрытое приложение не стёрло уже введённые точки маршрута.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import type { GeoLocation, OrderEstimate } from '@nurtaxi/shared-core/shared/model';

export interface OrderDraftState {
  regionId: string | null;
  pickup: GeoLocation | null;
  dropoff: GeoLocation | null;
  tariffId: string | null;
  paymentMethod: PaymentMethod;
  comment: string;
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
  dropoff: null,
  tariffId: null,
  paymentMethod: PaymentMethod.Cash,
  comment: '',
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
      state.pickup = action.payload;
      state.estimate = null;
    },
    dropoffSelected(state, action: PayloadAction<GeoLocation | null>) {
      state.dropoff = action.payload;
      state.estimate = null;
    },
    routeReversed(state) {
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
  },
});

export const {
  regionSelected,
  pickupSelected,
  dropoffSelected,
  routeReversed,
  tariffSelected,
  paymentMethodSelected,
  commentChanged,
  familyMemberSelected,
  estimateReceived,
  activeOrderChanged,
  orderDraftCleared,
} = orderDraftSlice.actions;

export const orderDraftReducer = orderDraftSlice.reducer;

export interface WithOrderDraftState {
  orderDraft: OrderDraftState;
}

export const selectOrderDraft = (state: WithOrderDraftState): OrderDraftState => state.orderDraft;

/** Расчёт цены возможен, только когда заданы обе точки и регион. */
export const selectCanEstimate = (state: WithOrderDraftState): boolean => {
  const { regionId, pickup, dropoff } = state.orderDraft;
  return Boolean(regionId && pickup && dropoff);
};

export const selectActiveOrderId = (state: WithOrderDraftState): string | null =>
  state.orderDraft.activeOrderId;
