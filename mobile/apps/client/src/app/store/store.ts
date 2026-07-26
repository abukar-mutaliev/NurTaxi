/**
 * Redux-store приложения клиента (M0.4).
 *
 * Что persist'ится: только не секретные данные — черновик заказа и выбранный регион.
 * Токены живут в SecureStore, профиль и заказы приходят из RTK Query, поэтому их
 * сохранение только создало бы риск показать устаревшие данные (`§20`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';

import { baseApi } from '@nurtaxi/shared-core/shared/api';
import { sessionReducer } from '@nurtaxi/shared-core/entities/session';
import { realtimeReducer } from '@nurtaxi/shared-core/features/realtime';

import { orderDraftReducer } from '@/processes/order-flow';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  session: sessionReducer,
  realtime: realtimeReducer,
  orderDraft: orderDraftReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'nurtaxi.client',
    version: 1,
    storage: AsyncStorage,
    whitelist: ['orderDraft'],
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

// Включает refetchOnReconnect / refetchOnFocus в RTK Query.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
