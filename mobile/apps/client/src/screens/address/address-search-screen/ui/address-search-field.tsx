import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  cardBg: 'rgba(255,255,255,0.82)',
  cardBorder: 'rgba(255,255,255,0.9)',
  cardBorderActive: 'rgba(201,154,84,0.55)',
  shadow: 'rgba(89,71,31,0.06)',
  text: '#2E2331',
  placeholder: '#A99FA6',
  iconOuter: 'rgba(252,244,228,0.95)',
  iconPickup: '#E8C882',
  iconDropoff: '#2E2331',
} as const;

export interface AddressSearchFieldProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  scale?: number;
  autoFocus?: boolean;
  variant?: 'pickup' | 'dropoff';
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
  const dotColor = variant === 'pickup' ? colors.iconPickup : colors.iconDropoff;

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
            style={[styles.input, { color: colors.text, fontSize: scale * 16 }]}
            value={value}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={[
              styles.inactiveText,
              { fontSize: scale * 16 },
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
    fontWeight: '500',
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
