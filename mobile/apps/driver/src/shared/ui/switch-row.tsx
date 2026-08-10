import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

export interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void | Promise<unknown>;
  disabled?: boolean;
}

/**
 * Строка настройки с переключателем.
 *
 * Переключатель двигается сразу, не дожидаясь ответа сервера, — иначе тумблер «залипает»
 * на плохой связи. Если запрос упал, оптимистичное значение снимается и строка
 * возвращается к подтверждённому состоянию.
 */
export function SwitchRow({ title, subtitle, value, onValueChange, disabled }: SwitchRowProps) {
  const theme = useTheme();
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  // Оптимистичное значение снимается, как только подтверждённый `value` его догнал —
  // прямо при рендере, без лишнего холостого прохода эффектом.
  if (pendingValue !== null && pendingValue === value) {
    setPendingValue(null);
  }

  const handleValueChange = (next: boolean) => {
    setPendingValue(next);
    void Promise.resolve(onValueChange(next)).catch(() => {
      if (valueRef.current !== next) {
        setPendingValue(null);
      }
    });
  };

  return (
    <View style={[styles.row, { gap: theme.spacing.md }]}>
      <View style={styles.textBlock}>
        <Text variant="body">{title}</Text>
        {subtitle ? (
          <Text tone="muted" variant="caption">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        disabled={disabled}
        ios_backgroundColor={theme.colors.surfaceMuted}
        onValueChange={handleValueChange}
        thumbColor={theme.colors.surface}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
        value={pendingValue ?? value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
});
