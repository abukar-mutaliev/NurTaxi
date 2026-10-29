/**
 * Корневой маршрут Expo Router (M0.3).
 * Файлы в `app/` намеренно тонкие: вся логика живёт в слоях FSD внутри `src/`.
 */
import { Stack } from 'expo-router';

import { AlertHost, Loader } from '@nurtaxi/shared-core/shared/ui';

import { AppProviders, useAuthGuard } from '@/app';
// Побочный эффект: регистрирует фоновую задачу геопозиции до монтирования компонентов (M8.2).
import '@/features/location-tracking';
import { IncomingOrderOverlay } from '@/widgets/incoming-order';

function RootNavigator() {
  const { isResolving } = useAuthGuard();

  // Пока не прочитан SecureStore и не загружен профиль водителя, показываем загрузку.
  if (isResolving) {
    return <Loader />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {/* Над всем стеком: заказ должен дойти до водителя на любом экране, а не только на смене. */}
      <IncomingOrderOverlay />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
      {/* Диалоги `showAlert` — поверх любого экрана, в стиле приложения. */}
      <AlertHost />
    </AppProviders>
  );
}
