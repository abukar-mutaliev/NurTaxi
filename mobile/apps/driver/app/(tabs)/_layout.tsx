import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GlassTabBar } from '@/widgets/tab-bar';

/**
 * Основные экраны водителя с плавающим нижним таб-баром: смена, заказы, доходы, профиль.
 * Сам бар — тот же «стеклянный» компонент, что и в приложении клиента.
 */
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: {
          backgroundColor: 'transparent',
          flex: 1,
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          position: 'absolute',
          shadowOpacity: 0,
        },
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders') }} />
      <Tabs.Screen name="earnings" options={{ title: t('tabs.earnings') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
