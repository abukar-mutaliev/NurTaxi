/**
 * Состояние канала реального времени.
 * Позиции водителя намеренно хранятся вне RTK Query: они приходят несколько раз в секунду,
 * и держать их в кэше запросов было бы дорого.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type {
  DriverLocationEvent,
  RealtimeStatus,
  SosActivatedEvent,
} from './realtime-events';

export interface DriverPosition {
  lat: number;
  lng: number;
  at: string;
}

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
      const { orderId, lat, lng, at } = action.payload;
      state.driverPositions[orderId] = { lat, lng, at };
    },
    sosReceived(state, action: PayloadAction<SosActivatedEvent>) {
      state.lastSos = action.payload;
    },
    realtimeReset() {
      return initialState;
    },
  },
});

export const { realtimeStatusChanged, driverPositionReceived, sosReceived, realtimeReset } =
  realtimeSlice.actions;

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
