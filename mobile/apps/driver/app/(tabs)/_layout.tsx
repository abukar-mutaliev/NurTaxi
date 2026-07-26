import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@nurtaxi/shared-core/shared/ui';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('driver.online') }} />
      <Tabs.Screen name="earnings" options={{ title: t('driver.earnings') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title') }} />
    </Tabs>
  );
}
