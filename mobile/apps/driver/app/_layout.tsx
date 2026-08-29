/**
 * Корневой маршрут Expo Router (M0.3).
 * Файлы в `app/` намеренно тонкие: вся логика живёт в слоях FSD внутри `src/`.
 */
import { Stack } from 'expo-router';

import { Loader } from '@nurtaxi/shared-core/shared/ui';

import { AppProviders, useAuthGuard } from '@/app';
// Побочный эффект: регистрирует фоновую задачу геопозиции до монтирования компонентов (M8.2).
import '@/features/location-tracking';

function RootNavigator() {
  const { isResolving } = useAuthGuard();

  // Пока не прочитан SecureStore и не загружен профиль водителя, показываем загрузку.
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
