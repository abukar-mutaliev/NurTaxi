import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { brandColors, shadows, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

const c = {
  cellBg: brandColors.background,
  cellBorder: brandColors.surfaceMuted,
  cellBorderActive: brandColors.primary,
  cellBorderError: brandColors.danger,
  shadow: brandColors.shadow,
  text: brandColors.text,
  error: brandColors.danger,
} as const;

export interface CodeOtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  editable?: boolean;
  /** Коэффициент подгонки под ширину экрана (макет — 390pt). */
  scale?: number;
}

/** Четыре крупные скруглённые ячейки кода из макета; ввод идёт в скрытое поле. */
export function CodeOtpInput({
  length = 4,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
  editable = true,
  scale = 1,
}: CodeOtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value.length === length) {
      onComplete?.(value);
    }
  }, [value, length, onComplete]);

  const cells = Array.from({ length }, (_, index) => value[index] ?? '');
  const cellSize = scale * 56;
  const cellRadius = scale * 18;

  return (
    <View style={{ gap: scale * 10 }}>
      <Pressable
        accessibilityLabel="Код подтверждения"
        onPress={() => inputRef.current?.focus()}
        style={[styles.row, { gap: scale * 12 }]}
      >
        {cells.map((char, index) => {
          const isActive = focused && index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              style={[
                styles.cell,
                {
                  borderColor: error
                    ? c.cellBorderError
                    : isActive
                      ? c.cellBorderActive
                      : c.cellBorder,
                  borderRadius: cellRadius,
                  height: cellSize,
                  width: cellSize,
                },
              ]}
            >
              <Text style={[styles.cellText, { fontSize: scale * typeScale.xxl }]}>{char}</Text>
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
        <Text style={[styles.error, { fontSize: scale * typeScale.sm }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    backgroundColor: c.cellBg,
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    ...shadows.md,
  },
  cellText: {
    color: c.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: c.error,
    textAlign: 'center',
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
