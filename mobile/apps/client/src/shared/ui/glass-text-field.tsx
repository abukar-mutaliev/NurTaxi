import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fontFamily, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from './glass-shadow';
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
      {label ? (
        <Text style={[styles.label, { fontSize: scale * typeScale.sm }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.shell,
          {
            borderRadius: scale * radius.lg,
            minHeight: inputProps.multiline ? scale * 96 : scale * 58,
            paddingHorizontal: scale * 18,
            paddingVertical: scale * 14,
          },
        ]}
      >
        <View style={styles.field}>
          {showPlaceholder && placeholder ? (
            <Text
              pointerEvents="none"
              style={[styles.placeholder, { fontSize: scale * typeScale.base }]}
            >
              {placeholder}
            </Text>
          ) : null}
          <TextInput
            placeholder=""
            style={[
              styles.input,
              { color: GLASS_COLORS.inputText, fontSize: scale * typeScale.base },
            ]}
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
    fontFamily: fontFamily.medium,
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
    ...glassShadow({ color: GLASS_COLORS.shadow }),
    width: '100%',
  },
});
