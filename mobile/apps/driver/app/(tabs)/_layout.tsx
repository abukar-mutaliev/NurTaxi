import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@nurtaxi/shared-core/shared/ui';

/**
 * Группа основных экранов водителя.
 *
 * Таб-бар скрыт: по макету смена занимает весь экран (карта + нижняя карточка), а переходы
 * в профиль и доходы идут круглой кнопкой в шапке и пунктами меню профиля. Структура вкладок
 * при этом сохранена — маршруты и глубокие ссылки продолжают работать.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('driver.online') }} />
      <Tabs.Screen name="earnings" options={{ title: t('driver.earnings') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title') }} />
    </Tabs>
  );
}
