import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Text } from './text';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Вызывается, когда введена последняя цифра, — для автоматической отправки. */
  onComplete?: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

/**
 * Поле ввода кода из SMS (`M1.3`). Используется один скрытый TextInput, чтобы корректно
 * работали автозаполнение кода из SMS на iOS/Android и удаление по Backspace.
 */
export function OtpInput({
  length = 4,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
  editable = true,
}: OtpInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value.length === length) {
      onComplete?.(value);
    }
  }, [value, length, onComplete]);

  const cells = Array.from({ length }, (_, index) => value[index] ?? '');

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        accessibilityLabel="Код подтверждения"
        onPress={() => inputRef.current?.focus()}
        style={[styles.row, { gap: theme.spacing.sm }]}
      >
        {cells.map((char, index) => {
          const isActive = focused && index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              style={[
                styles.cell,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: error
                    ? theme.colors.danger
                    : isActive
                      ? theme.colors.primary
                      : theme.colors.border,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text variant="title">{char}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        caretHidden
        editable={editable}
        keyboardType="number-pad"
        maxLength={length}
        onBlur={() => setFocused(false)}
        onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        style={styles.hiddenInput}
        textContentType="oneTimeCode"
        value={value}
      />

      {error ? (
        <Text tone="danger" variant="caption">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 60,
    justifyContent: 'center',
    width: 52,
  },
  hiddenInput: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
