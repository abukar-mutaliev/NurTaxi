/**
 * Корневой маршрут Expo Router (M0.3).
 * Файлы в `app/` намеренно тонкие: вся логика живёт в слоях FSD внутри `src/`.
 */
import { Stack } from 'expo-router';

import { Loader } from '@nurtaxi/shared-core/shared/ui';

import { AppProviders, initSentry, useAuthGuard } from '@/app';

initSentry();

function RootNavigator() {
  const { isResolving } = useAuthGuard();

  // Пока не прочитан SecureStore, показываем загрузку — иначе мигнёт экран входа.
  if (isResolving) {
    return <Loader />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
