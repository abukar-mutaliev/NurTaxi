/**
 * Redux-store приложения клиента (M0.4).
 *
 * Что persist'ится: только не секретные данные — черновик заказа и выбранный регион.
 * Токены живут в SecureStore, профиль и заказы приходят из RTK Query, поэтому их
 * сохранение только создало бы риск показать устаревшие данные (`§20`).
 */
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createMigrate,
  persistReducer,
  persistStore,
  type PersistedState,
} from 'redux-persist';

import { baseApi } from '@nurtaxi/shared-core/shared/api';
import { persistStorage, toApiGeoLocation } from '@nurtaxi/shared-core/shared/lib';
import type { GeoLocation } from '@nurtaxi/shared-core/shared/model';
import { sessionReducer } from '@nurtaxi/shared-core/entities/session';
import { networkReducer, setupNetworkListeners } from '@nurtaxi/shared-core/features/network';
import { realtimeReducer } from '@nurtaxi/shared-core/features/realtime';

import {
  orderDraftReducer,
  recentAddressesReducer,
  sanitizeRecentAddress,
} from '@/processes/order-flow';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  session: sessionReducer,
  network: networkReducer,
  realtime: realtimeReducer,
  orderDraft: orderDraftReducer,
  recentAddresses: recentAddressesReducer,
});

type PersistedRootState = ReturnType<typeof rootReducer>;

const persistMigrations = createMigrate(
  {
    2: (state) => {
      const persisted = state as (PersistedRootState & PersistedState) | undefined;
      if (!persisted?.orderDraft) {
        return state;
      }

      const normalizeStoredLocation = (location: (GeoLocation & { label?: string }) | null) =>
        location ? toApiGeoLocation(location) : null;

      return {
        ...persisted,
        orderDraft: {
          ...persisted.orderDraft,
          pickup: normalizeStoredLocation(persisted.orderDraft.pickup),
          dropoff: normalizeStoredLocation(persisted.orderDraft.dropoff),
        },
      } as PersistedState;
    },
    3: (state) => {
      const persisted = state as (PersistedRootState & PersistedState) | undefined;
      if (!persisted) {
        return state;
      }

      const items = Array.isArray(persisted.recentAddresses?.items)
        ? persisted.recentAddresses.items
        : [];

      return {
        ...persisted,
        recentAddresses: {
          items: items
            .map(sanitizeRecentAddress)
            .filter((item): item is NonNullable<typeof item> => item !== null),
        },
      } as PersistedState;
    },
  },
  { debug: false },
);

const persistedReducer = persistReducer(
  {
    key: 'nurtaxi.client',
    version: 3,
    storage: persistStorage,
    whitelist: ['orderDraft', 'recentAddresses'],
    migrate: persistMigrations,
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Служебные экшены redux-persist содержат несериализуемые поля по своей природе.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
});

export const persistor = persistStore(store);

// NetInfo + refetchOnReconnect / refetchOnFocus для RTK Query (M5.5).
setupNetworkListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
