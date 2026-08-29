/**
 * Корневой маршрут Expo Router (M0.3).
 * Файлы в `app/` намеренно тонкие: вся логика живёт в слоях FSD внутри `src/`.
 */
import { Stack } from 'expo-router';

import { Loader } from '@nurtaxi/shared-core/shared/ui';
import { useNotificationHandlers } from '@nurtaxi/shared-core/features/notifications';

import { AppProviders, useAuthGuard } from '@/app';

function RootNavigator() {
  const { isResolving } = useAuthGuard();
  useNotificationHandlers();

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
