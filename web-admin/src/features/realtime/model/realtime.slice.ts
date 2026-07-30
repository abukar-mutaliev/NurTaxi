import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RealtimeStatus, SosActivatedEvent } from './realtime-events';

export interface RealtimeState {
  status: RealtimeStatus;
  lastSos: SosActivatedEvent | null;
}

const initialState: RealtimeState = {
  status: 'idle',
  lastSos: null,
};

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    realtimeStatusChanged(state, action: PayloadAction<RealtimeStatus>) {
      state.status = action.payload;
    },
    sosReceived(state, action: PayloadAction<SosActivatedEvent>) {
      state.lastSos = action.payload;
    },
  },
});

export const { realtimeStatusChanged, sosReceived } = realtimeSlice.actions;
export const realtimeReducer = realtimeSlice.reducer;
