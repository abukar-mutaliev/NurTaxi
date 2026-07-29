/**
 * Связывает NetInfo с RTK Query `refetchOnReconnect` (M5.5).
 *
 * В React Native нет событий `window.online/offline`, поэтому подключаем
 * `@react-native-community/netinfo` как источник статуса сети.
 */
import NetInfo from '@react-native-community/netinfo';
import { setupListeners } from '@reduxjs/toolkit/query';
import type { Dispatch } from '@reduxjs/toolkit';

export function setupNetworkListeners(dispatch: Dispatch): void {
  setupListeners(dispatch, (_dispatch, { onOnline, onOffline }) => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        onOnline();
      } else {
        onOffline();
      }
    });

    return () => {
      unsubscribe();
    };
  });
}
