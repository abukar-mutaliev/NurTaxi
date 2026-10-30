import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { brandColors, fontFamily, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from '@/shared/ui/glass-shadow';

const colors = {
  cardBg: brandColors.surface,
  cardBorder: brandColors.divider,
  cardBorderActive: brandColors.primary,
  shadow: brandColors.shadow,
  text: brandColors.text,
  placeholder: brandColors.textMuted,
  iconOuter: brandColors.primary,
  iconPickup: brandColors.primary,
  iconStop: brandColors.primary,
  iconDropoff: brandColors.text,
} as const;

export interface AddressSearchFieldProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  scale?: number;
  autoFocus?: boolean;
  variant?: 'pickup' | 'stop' | 'dropoff';
  active?: boolean;
  onActivate?: () => void;
}

export function AddressSearchField({
  value,
  placeholder,
  onChangeText,
  scale = 1,
  autoFocus = false,
  variant = 'dropoff',
  active = true,
  onActivate,
}: AddressSearchFieldProps) {
  const dotColor =
    variant === 'pickup'
      ? colors.iconPickup
      : variant === 'stop'
        ? colors.iconStop
        : colors.iconDropoff;

  const field = (
    <View
      style={[
        styles.field,
        {
          borderRadius: scale * 22,
          gap: scale * 12,
          minHeight: scale * 58,
          paddingHorizontal: scale * 18,
          paddingVertical: scale * 14,
        },
        active ? styles.fieldActive : styles.fieldInactive,
      ]}
    >
      <View
        style={[
          styles.iconOuter,
          {
            height: scale * 36,
            width: scale * 36,
          },
        ]}
      >
        <View
          style={[
            styles.iconInner,
            {
              backgroundColor: dotColor,
              height: scale * 14,
              width: scale * 14,
            },
          ]}
        />
      </View>

      <View style={styles.inputWrap}>
        {active ? (
          <TextInput
            autoFocus={autoFocus}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            style={[styles.input, { color: colors.text, fontSize: scale * typeScale.base }]}
            value={value}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={[
              styles.inactiveText,
              { fontSize: scale * typeScale.base },
              !value ? styles.placeholderText : null,
            ]}
          >
            {value || placeholder}
          </Text>
        )}
      </View>
    </View>
  );

  if (!active && onActivate) {
    return (
      <Pressable accessibilityRole="button" onPress={onActivate}>
        {field}
      </Pressable>
    );
  }

  return field;
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    ...glassShadow({ color: colors.shadow }),
  },
  fieldActive: {
    borderColor: colors.cardBorderActive,
  },
  fieldInactive: {
    borderColor: colors.cardBorder,
  },
  iconInner: {
    borderRadius: 999,
  },
  iconOuter: {
    alignItems: 'center',
    backgroundColor: colors.iconOuter,
    borderRadius: 999,
    justifyContent: 'center',
  },
  inactiveText: {
    color: colors.text,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.medium,
    padding: 0,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 28,
  },
  placeholderText: {
    color: colors.placeholder,
    fontWeight: '400',
  },
});
