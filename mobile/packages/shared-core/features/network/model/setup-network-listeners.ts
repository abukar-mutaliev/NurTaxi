/**
 * Связывает RTK Query с состоянием сети и с возвращением приложения на экран (M5.5).
 *
 * В React Native нет ни `window.online/offline`, ни события фокуса окна, поэтому оба
 * источника подключаем вручную: `@react-native-community/netinfo` даёт статус сети,
 * `AppState` — переход приложения на передний план.
 *
 * Фокус важен не меньше сети. Свёрнутое приложение на Android теряет WebSocket за
 * считаные секунды и пропускает все события: клиент не узнаёт, что водитель принял
 * заказ, выехал и прибыл. Сеть при этом никуда не пропадала, поэтому одним
 * `refetchOnReconnect` дыру не закрыть — данные так и остались бы устаревшими.
 */
import NetInfo from '@react-native-community/netinfo';
import { setupListeners } from '@reduxjs/toolkit/query';
import type { Dispatch } from '@reduxjs/toolkit';
import { AppState } from 'react-native';

export function setupNetworkListeners(dispatch: Dispatch): void {
  setupListeners(dispatch, (_dispatch, { onOnline, onOffline, onFocus, onFocusLost }) => {
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        onOnline();
      } else {
        onOffline();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        onFocus();
      } else {
        onFocusLost();
      }
    });

    return () => {
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  });
}
