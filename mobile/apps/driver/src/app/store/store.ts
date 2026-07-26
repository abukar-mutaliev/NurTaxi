/**
 * Redux-store приложения водителя (M0.4).
 *
 * Persist'ится только состояние смены: если приложение перезапустится посреди рабочего дня,
 * водитель не должен заново разбираться, был ли он на линии. Токены — в SecureStore,
 * профиль и заказы — в кэше RTK Query.
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

import { shiftReducer } from '@/processes/shift';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  session: sessionReducer,
  realtime: realtimeReducer,
  shift: shiftReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'nurtaxi.driver',
    version: 1,
    storage: AsyncStorage,
    whitelist: ['shift'],
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
