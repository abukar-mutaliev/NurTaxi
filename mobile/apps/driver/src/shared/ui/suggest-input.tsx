import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Input, Text, useTheme, type InputProps } from '@nurtaxi/shared-core/shared/ui';

export interface SuggestOption {
  /** Стабильный ключ элемента списка. */
  id: string;
  /** Основная строка — попадёт в поле при выборе. */
  title: string;
  /** Уточнение (город, район) — только для показа. */
  subtitle?: string;
}

export interface SuggestInputProps extends Omit<InputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (value: string) => void;
  /** Готовый список подсказок; фильтрацию делает вызывающая сторона. */
  options: SuggestOption[];
  onSelect: (option: SuggestOption) => void;
  loading?: boolean;
  /** Подпись, когда подсказок нет, но запрос уже осмысленный. */
  emptyHint?: string;
  maxVisible?: number;
}

/**
 * Поле ввода с выпадающим списком подсказок (адрес, марка, модель, цвет).
 *
 * Список показывается только при фокусе и непустом наборе опций, поэтому один и тот же
 * компонент подходит и для серверного поиска адресов, и для локальных справочников.
 */
export function SuggestInput({
  value,
  onChangeText,
  options,
  onSelect,
  loading = false,
  emptyHint,
  maxVisible = 6,
  onFocus,
  onBlur,
  ...inputProps
}: SuggestInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const visible = options.slice(0, maxVisible);
  const showList = focused && (visible.length > 0 || loading || Boolean(emptyHint));

  return (
    <View style={{ gap: theme.spacing.xs, zIndex: focused ? 20 : 0 }}>
      <Input
        {...inputProps}
        onBlur={(event) => {
          // Небольшая задержка, чтобы нажатие по подсказке успело сработать.
          setTimeout(() => setFocused(false), 150);
          onBlur?.(event);
        }}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        value={value}
      />

      {showList ? (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            elevation: 4,
            maxHeight: 232,
            overflow: 'hidden',
            shadowColor: 'rgba(89,71,31,0.14)',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 1,
            shadowRadius: 12,
          }}
        >
          {loading && visible.length === 0 ? (
            <View style={{ padding: theme.spacing.md }}>
              <Text tone="muted" variant="caption">
                Поиск…
              </Text>
            </View>
          ) : visible.length === 0 ? (
            <View style={{ padding: theme.spacing.md }}>
              <Text tone="muted" variant="caption">
                {emptyHint}
              </Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled>
              {visible.map((option, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => {
                    onSelect(option);
                    setFocused(false);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent',
                    borderTopColor: theme.colors.border,
                    borderTopWidth: index === 0 ? 0 : 1,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.md,
                  })}
                >
                  <Text variant="body">{option.title}</Text>
                  {option.subtitle ? (
                    <Text tone="muted" variant="caption">
                      {option.subtitle}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}
