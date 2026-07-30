import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/entities/user';
import { Role } from '@/shared/model/enums';
import { sessionUnauthorized } from './session-events';
import { initialSessionState } from './session.types';

const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      if (action.payload?.role !== Role.SuperAdmin && action.payload?.assignedRegionId) {
        state.selectedRegionId = action.payload.assignedRegionId;
      }
    },
    setBootstrapped(state, action: PayloadAction<boolean>) {
      state.isBootstrapped = action.payload;
    },
    setSelectedRegionId(state, action: PayloadAction<string | null>) {
      state.selectedRegionId = action.payload;
    },
    clearSession(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.selectedRegionId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sessionUnauthorized, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.selectedRegionId = null;
    });
  },
});

export const { setUser, setBootstrapped, setSelectedRegionId, clearSession } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
