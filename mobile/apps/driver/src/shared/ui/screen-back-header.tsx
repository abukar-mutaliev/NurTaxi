import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

import { RoundButton } from './round-button';

export interface ScreenBackHeaderProps {
  title: string;
  /** Куда уходить, когда возвращаться некуда (экран открыт как корень стека). */
  fallbackHref?: Href;
}

/**
 * Шапка внутреннего экрана: круглая кнопка «назад» и заголовок.
 *
 * Верхний отступ считается здесь: базовый `Screen` из общего кита не учитывает вырез
 * экрана, и без этого заголовок прилипает к статус-бару. В отличие от `StepHeader`
 * здесь нет прогресса — экран не часть визарда.
 */
export function ScreenBackHeader({
  title,
  fallbackHref = '/(tabs)/profile' as Href,
}: ScreenBackHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  };

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xs,
        paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.md,
      }}
    >
      <RoundButton accessibilityLabel="Назад" icon="back" onPress={goBack} size={40} />
      <Text style={{ flex: 1 }} variant="title">
        {title}
      </Text>
    </View>
  );
}
