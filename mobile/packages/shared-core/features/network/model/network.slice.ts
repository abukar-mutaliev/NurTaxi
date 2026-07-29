/**
 * Состояние сетевого подключения устройства (M5.5, Des §11).
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const initialState: NetworkState = {
  isConnected: true,
  isInternetReachable: null,
};

export const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    networkStatusChanged(
      state,
      action: PayloadAction<{ isConnected: boolean; isInternetReachable: boolean | null }>,
    ) {
      state.isConnected = action.payload.isConnected;
      state.isInternetReachable = action.payload.isInternetReachable;
    },
  },
});

export const { networkStatusChanged } = networkSlice.actions;
export const networkReducer = networkSlice.reducer;

export interface WithNetworkState {
  network: NetworkState;
}

export const selectIsNetworkConnected = (state: WithNetworkState): boolean =>
  state.network.isConnected;
