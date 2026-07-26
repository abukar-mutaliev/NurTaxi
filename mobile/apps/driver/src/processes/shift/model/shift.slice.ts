/**
 * Смена водителя — сквозной процесс «на линии» (M8).
 *
 * Держит локальное представление о том, работает ли водитель сейчас и какой заказ выполняет.
 * Источник истины по статусу — сервер (`PATCH /driver/status`); здесь хранится оптимистичное
 * значение, чтобы переключатель не «залипал» при плохой связи.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

export interface ShiftState {
  /** Намерение водителя быть на линии. Сервер может отказать (нет верификации). */
  wantsOnline: boolean;
  /** Запущена ли фоновая задача передачи геопозиции. */
  isTrackingLocation: boolean;
  lastSentPosition: (GeoPoint & { at: string }) | null;
  /** Заказ, который водитель сейчас выполняет. */
  currentOrderId: string | null;
  /** Предложение заказа, показанное водителю, и момент, когда оно истекает. */
  pendingOfferOrderId: string | null;
  pendingOfferExpiresAt: string | null;
}

const initialState: ShiftState = {
  wantsOnline: false,
  isTrackingLocation: false,
  lastSentPosition: null,
  currentOrderId: null,
  pendingOfferOrderId: null,
  pendingOfferExpiresAt: null,
};

export const shiftSlice = createSlice({
  name: 'shift',
  initialState,
  reducers: {
    onlineIntentChanged(state, action: PayloadAction<boolean>) {
      state.wantsOnline = action.payload;
      if (!action.payload) {
        state.pendingOfferOrderId = null;
        state.pendingOfferExpiresAt = null;
      }
    },
    locationTrackingChanged(state, action: PayloadAction<boolean>) {
      state.isTrackingLocation = action.payload;
    },
    positionSent(state, action: PayloadAction<GeoPoint>) {
      state.lastSentPosition = { ...action.payload, at: new Date().toISOString() };
    },
    currentOrderChanged(state, action: PayloadAction<string | null>) {
      state.currentOrderId = action.payload;
      state.pendingOfferOrderId = null;
      state.pendingOfferExpiresAt = null;
    },
    offerReceived(state, action: PayloadAction<{ orderId: string; expiresAt: string }>) {
      state.pendingOfferOrderId = action.payload.orderId;
      state.pendingOfferExpiresAt = action.payload.expiresAt;
    },
    offerDismissed(state) {
      state.pendingOfferOrderId = null;
      state.pendingOfferExpiresAt = null;
    },
  },
});

export const {
  onlineIntentChanged,
  locationTrackingChanged,
  positionSent,
  currentOrderChanged,
  offerReceived,
  offerDismissed,
} = shiftSlice.actions;

export const shiftReducer = shiftSlice.reducer;

export interface WithShiftState {
  shift: ShiftState;
}

export const selectShift = (state: WithShiftState): ShiftState => state.shift;
export const selectWantsOnline = (state: WithShiftState): boolean => state.shift.wantsOnline;
export const selectCurrentOrderId = (state: WithShiftState): string | null =>
  state.shift.currentOrderId;
export const selectPendingOffer = (state: WithShiftState): string | null =>
  state.shift.pendingOfferOrderId;
