import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

export default function NotFoundRoute() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Страница не найдена' }} />
      <Screen>
        <View style={{ flex: 1, gap: theme.spacing.md, justifyContent: 'center' }}>
          <Text variant="title">Страница не найдена</Text>
          <Link href="/(tabs)">
            <Text tone="primary">Вернуться на главную</Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
