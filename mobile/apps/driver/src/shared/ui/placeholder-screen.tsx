/**
 * Технологическая заглушка для ещё не реализованных экранов.
 *
 * Каждый маршрут из `docs/mob.tasks.md` уже существует и открывается — это позволяет
 * проверять навигацию и deep links до того, как экран написан. Заменяя заглушку,
 * удалите её импорт: остаток заглушек показывает реальный прогресс по фазам.
 */
import { View } from 'react-native';

import { Badge, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

export interface PlaceholderScreenProps {
  /** Идентификатор задачи из `docs/mob.tasks.md`, например `M4.5`. */
  task: string;
  title: string;
  description?: string;
  /** Эндпоинты API, которые понадобятся этому экрану. */
  endpoints?: string[];
}

export function PlaceholderScreen({
  task,
  title,
  description,
  endpoints = [],
}: PlaceholderScreenProps) {
  const theme = useTheme();

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.xxl }}>
        <Badge label={task} tone="warning" />
        <Text variant="title">{title}</Text>
        {description ? <Text tone="muted">{description}</Text> : null}

        {endpoints.length > 0 ? (
          <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.md }}>
            <Text variant="label">API</Text>
            {endpoints.map((endpoint) => (
              <Text key={endpoint} tone="muted" variant="caption">
                {endpoint}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
