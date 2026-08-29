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
  return `${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`;
}

function toAddressText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Отсекает битые записи из persist (строковые координаты, пустой адрес) — иначе падает список. */
export function sanitizeRecentAddress(item: unknown): RecentAddress | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const raw = item as Partial<RecentAddress>;
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const address = toAddressText(raw.address);
  const label = toAddressText(raw.label);
  const text = address || label;
  if (!text) {
    return null;
  }

  return {
    id: toAddressText(raw.id) || makeRecentAddressId(lat, lng),
    label: label || text.split(',')[0]?.trim() || text,
    address: address || text,
    lat,
    lng,
    usedAt: Number(raw.usedAt) || 0,
  };
}

export function buildRecentAddress(input: {
  lat: number;
  lng: number;
  address: string;
  label?: string;
}): RecentAddress {
  const address = toAddressText(input.address) || toAddressText(input.label);
  const label = toAddressText(input.label) || address.split(',')[0]?.trim() || address;
  const lat = Number(input.lat);
  const lng = Number(input.lng);

  return {
    id: makeRecentAddressId(lat, lng),
    label: label || address,
    address: address || label,
    lat,
    lng,
    usedAt: Date.now(),
  };
}

export const recentAddressesSlice = createSlice({
  name: 'recentAddresses',
  initialState,
  reducers: {
    recentAddressUsed(state, action: PayloadAction<RecentAddress>) {
      const next = sanitizeRecentAddress({ ...action.payload, usedAt: Date.now() });
      if (!next) {
        return;
      }

      const items = Array.isArray(state.items) ? state.items : [];
      const existingIndex = items.findIndex((item) => item.id === next.id);
      if (existingIndex >= 0) {
        items[existingIndex] = next;
        state.items = items;
        return;
      }

      state.items = [next, ...items].slice(0, MAX_RECENT_ADDRESSES);
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
  (state.recentAddresses?.items ?? [])
    .map(sanitizeRecentAddress)
    .filter((item): item is RecentAddress => item !== null);
