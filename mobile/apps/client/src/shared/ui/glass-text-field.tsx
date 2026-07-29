import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS } from './glass-theme';

export interface GlassTextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  scale?: number;
}

export function GlassTextField({
  label,
  scale = 1,
  value,
  placeholder,
  ...inputProps
}: GlassTextFieldProps) {
  const showPlaceholder = !value || String(value).length === 0;

  return (
    <View style={{ gap: scale * 8 }}>
      {label ? <Text style={[styles.label, { fontSize: scale * 13 }]}>{label}</Text> : null}
      <View
        style={[
          styles.shell,
          {
            borderRadius: scale * 18,
            minHeight: inputProps.multiline ? scale * 96 : scale * 58,
            paddingHorizontal: scale * 18,
            paddingVertical: scale * 14,
          },
        ]}
      >
        <View style={styles.field}>
          {showPlaceholder && placeholder ? (
            <Text pointerEvents="none" style={[styles.placeholder, { fontSize: scale * 16 }]}>
              {placeholder}
            </Text>
          ) : null}
          <TextInput
            placeholder=""
            style={[styles.input, { color: GLASS_COLORS.inputText, fontSize: scale * 16 }]}
            value={value}
            {...inputProps}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 28,
  },
  input: {
    flex: 1,
    fontWeight: '500',
    padding: 0,
    textAlignVertical: 'top',
  },
  label: {
    color: GLASS_COLORS.subtitle,
    fontWeight: '500',
  },
  placeholder: {
    color: GLASS_COLORS.inputPlaceholder,
    fontWeight: '500',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  shell: {
    backgroundColor: GLASS_COLORS.inputBg,
    borderColor: GLASS_COLORS.inputBorder,
    borderWidth: 1,
    elevation: 2,
    shadowColor: GLASS_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    width: '100%',
  },
});
