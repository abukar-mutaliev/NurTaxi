/**
 * Корневые провайдеры приложения (M0.3, M0.4, M0.7, M0.8, M0.9).
 *
 * Порядок важен: Redux → восстановление persist → безопасные зоны → тема → i18n →
 * перехват ошибок → загрузка сессии. `SessionGate` обязан находиться внутри `Provider`,
 * потому что читает и пишет состояние сессии.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { i18n, initI18n } from '@nurtaxi/shared-core/shared/i18n';
import { Loader, ThemeProvider } from '@nurtaxi/shared-core/shared/ui';
import { useSessionBootstrap } from '@nurtaxi/shared-core/features/auth';
import { NetworkBanner, useNetworkMonitor } from '@nurtaxi/shared-core/features/network';
import { usePushRegistration } from '@nurtaxi/shared-core/features/notifications';
import { useRealtimeConnection } from '@nurtaxi/shared-core/features/realtime';

import { persistor, store } from '../store/store';
import { AppErrorBoundary } from './error-boundary';

initI18n();

/** Запускает фоновые процессы, которым нужен доступ к store. */
function SessionGate({ children }: { children: ReactNode }) {
  useSessionBootstrap();
  useNetworkMonitor();
  useRealtimeConnection();
  usePushRegistration();
  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loader />} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ThemeProvider>
              <I18nextProvider i18n={i18n}>
                <AppErrorBoundary>
                  <View style={{ flex: 1 }}>
                    <NetworkBanner />
                    <SessionGate>{children}</SessionGate>
                  </View>
                </AppErrorBoundary>
              </I18nextProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
