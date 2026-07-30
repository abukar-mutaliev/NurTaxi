import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

import { RoundButton } from './round-button';

export interface StepHeaderProps {
  title: string;
  step: number;
  totalSteps: number;
  caption: string;
  onBack?: () => void;
}

/**
 * Шапка визарда (анкета, документы): круглая кнопка назад, заголовок, тонкий прогресс-бар
 * и подпись шага. Общая для обоих экранов верификации водителя (M7.1 / M7.2).
 *
 * Верхний отступ считается здесь: базовый `Screen` из общего кита не учитывает вырез экрана,
 * и без этого заголовок прилипает к статус-бару.
 */
export function StepHeader({ title, step, totalSteps, caption, onBack }: StepHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = Math.min(1, Math.max(0, step / totalSteps));

  return (
    <View
      style={{
        gap: theme.spacing.md,
        paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.md,
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md }}>
        <RoundButton
          accessibilityLabel="Назад"
          icon="back"
          onPress={onBack ?? (() => router.back())}
          size={40}
        />
        <Text style={{ flex: 1 }} variant="title">
          {title}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <View
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.pill,
            height: 4,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.pill,
              height: '100%',
              width: `${progress * 100}%`,
            }}
          />
        </View>
        <Text tone="muted" variant="caption">
          Шаг {step} из {totalSteps} · {caption}
        </Text>
      </View>
    </View>
  );
}
