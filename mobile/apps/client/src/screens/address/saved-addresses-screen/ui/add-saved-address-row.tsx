import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  cardBg: 'rgba(255,255,255,0.62)',
  cardBorder: 'rgba(201,154,84,0.35)',
  shadow: 'rgba(89,71,31,0.06)',
  title: '#2E2331',
  iconOuter: 'rgba(252,244,228,0.95)',
  iconAccent: 'rgba(201,154,84,0.8)',
} as const;

export interface AddSavedAddressRowProps {
  title: string;
  onPress: () => void;
}

export function AddSavedAddressRow({ title, onPress }: AddSavedAddressRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconOuter}>
        <View style={styles.plusHorizontal} />
        <View style={styles.plusVertical} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    gap: 16,
    minHeight: 72,
    paddingHorizontal: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  iconOuter: {
    alignItems: 'center',
    backgroundColor: colors.iconOuter,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  plusHorizontal: {
    backgroundColor: colors.iconAccent,
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    width: 14,
  },
  plusVertical: {
    backgroundColor: colors.iconAccent,
    borderRadius: 1,
    height: 14,
    position: 'absolute',
    width: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  title: {
    color: colors.title,
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
