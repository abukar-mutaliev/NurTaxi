/**
 * Состояние канала реального времени.
 * Позиции водителя намеренно хранятся вне RTK Query: они приходят несколько раз в секунду,
 * и держать их в кэше запросов было бы дорого.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { mergeDriverPosition, type DriverPosition } from './merge-driver-position';
import type { DriverLocationEvent, RealtimeStatus, SosActivatedEvent } from './realtime-events';

export type { DriverPosition };

export interface RealtimeState {
  status: RealtimeStatus;
  /** Последняя известная позиция водителя по каждому отслеживаемому заказу. */
  driverPositions: Record<string, DriverPosition>;
  lastSos: SosActivatedEvent | null;
}

const initialState: RealtimeState = {
  status: 'idle',
  driverPositions: {},
  lastSos: null,
};

export const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    realtimeStatusChanged(state, action: PayloadAction<RealtimeStatus>) {
      state.status = action.payload;
    },
    driverPositionReceived(state, action: PayloadAction<DriverLocationEvent>) {
      const { orderId } = action.payload;
      const next = mergeDriverPosition(state.driverPositions[orderId], action.payload);
      if (!next) {
        return;
      }
      state.driverPositions[orderId] = next;
    },
    /** Заказ закрыт — точку больше некому показывать. */
    driverPositionCleared(state, action: PayloadAction<string>) {
      delete state.driverPositions[action.payload];
    },
    sosReceived(state, action: PayloadAction<SosActivatedEvent>) {
      state.lastSos = action.payload;
    },
    realtimeReset() {
      return initialState;
    },
  },
});

export const {
  realtimeStatusChanged,
  driverPositionReceived,
  driverPositionCleared,
  sosReceived,
  realtimeReset,
} = realtimeSlice.actions;

export const realtimeReducer = realtimeSlice.reducer;

export interface WithRealtimeState {
  realtime: RealtimeState;
}

export const selectRealtimeStatus = (state: WithRealtimeState): RealtimeStatus =>
  state.realtime.status;

export const selectIsRealtimeOnline = (state: WithRealtimeState): boolean =>
  state.realtime.status === 'connected';

export const selectDriverPosition =
  (orderId: string) =>
  (state: WithRealtimeState): DriverPosition | undefined =>
    state.realtime.driverPositions[orderId];

export const selectLastSos = (state: WithRealtimeState): SosActivatedEvent | null =>
  state.realtime.lastSos;
