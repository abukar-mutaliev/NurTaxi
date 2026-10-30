/**
 * Корневой маршрут Expo Router (M0.3).
 * Файлы в `app/` намеренно тонкие: вся логика живёт в слоях FSD внутри `src/`.
 */
import { Stack } from 'expo-router';

import { AlertHost, Loader, useBrandFonts } from '@nurtaxi/shared-core/shared/ui';
import { useNotificationHandlers } from '@nurtaxi/shared-core/features/notifications';

import { AppProviders, useAuthGuard } from '@/app';

function RootNavigator() {
  const { isResolving } = useAuthGuard();
  const fontsReady = useBrandFonts();
  useNotificationHandlers();

  // Пока не прочитан SecureStore, показываем загрузку — иначе мигнёт экран входа.
  // Шрифт ждём там же: без него первый экран на миг рисовался системным.
  if (isResolving || !fontsReady) {
    return <Loader />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
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
