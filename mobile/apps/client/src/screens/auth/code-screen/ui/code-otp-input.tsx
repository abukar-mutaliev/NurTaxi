import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  cellBg: 'rgba(255,255,255,0.72)',
  cellBorder: 'rgba(255,255,255,0.9)',
  cellBorderActive: '#C99A54',
  cellBorderError: '#B42318',
  shadow: 'rgba(89,71,31,0.06)',
  text: '#2E2331',
  error: '#B42318',
} as const;

export interface CodeOtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  editable?: boolean;
  scale?: number;
}

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
  const cellSize = scale * 58;
  const cellRadius = scale * 18;
  const cellGap = scale * 10;

  return (
    <View style={{ gap: scale * 8 }}>
      <Pressable
        accessibilityLabel="Код подтверждения"
        onPress={() => inputRef.current?.focus()}
        style={[styles.row, { gap: cellGap }]}
      >
        {cells.map((char, index) => {
          const isActive = focused && index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.cellBg,
                  borderColor: error
                    ? colors.cellBorderError
                    : isActive
                      ? colors.cellBorderActive
                      : colors.cellBorder,
                  borderRadius: cellRadius,
                  height: cellSize,
                  shadowColor: colors.shadow,
                  width: cellSize,
                },
              ]}
            >
              <Text style={[styles.cellText, { fontSize: scale * 22 }]}>{char}</Text>
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

      {error ? <Text style={[styles.error, { fontSize: scale * 13 }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  cellText: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: colors.error,
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
