/**
 * Недавно выбранные адреса клиента (локально, redux-persist).
 * Пополняется при выборе из поиска или с карты, без «Моё местоположение» и избранного.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface RecentAddress {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  usedAt: number;
}

export interface RecentAddressesState {
  items: RecentAddress[];
}

export const MAX_RECENT_ADDRESSES = 10;

const initialState: RecentAddressesState = {
  items: [],
};

export function makeRecentAddressId(lat: number, lng: number): string {
  return `${lat.toFixed(5)}_${lng.toFixed(5)}`;
}

export function buildRecentAddress(input: {
  lat: number;
  lng: number;
  address: string;
  label?: string;
}): RecentAddress {
  const address = input.address.trim();
  const label = input.label?.trim() || address.split(',')[0]?.trim() || address;

  return {
    id: makeRecentAddressId(input.lat, input.lng),
    label,
    address,
    lat: input.lat,
    lng: input.lng,
    usedAt: Date.now(),
  };
}

export const recentAddressesSlice = createSlice({
  name: 'recentAddresses',
  initialState,
  reducers: {
    recentAddressUsed(state, action: PayloadAction<RecentAddress>) {
      const next = action.payload;
      const filtered = state.items.filter((item) => item.id !== next.id);
      state.items = [next, ...filtered].slice(0, MAX_RECENT_ADDRESSES);
    },
    recentAddressesCleared(state) {
      state.items = [];
    },
  },
});

export const { recentAddressUsed, recentAddressesCleared } = recentAddressesSlice.actions;
export const recentAddressesReducer = recentAddressesSlice.reducer;

export interface WithRecentAddressesState {
  recentAddresses: RecentAddressesState;
}

export const selectRecentAddresses = (state: WithRecentAddressesState): RecentAddress[] =>
  state.recentAddresses.items;
