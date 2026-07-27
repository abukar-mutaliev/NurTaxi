import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const colors = {
  glassBg: 'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  icon: '#2E2331',
} as const;

export interface GlassIconButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
}

export function GlassIconButton({ accessibilityLabel, onPress, children }: GlassIconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function GlassAddIconButton({
  accessibilityLabel,
  onPress,
}: {
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <GlassIconButton accessibilityLabel={accessibilityLabel} onPress={onPress}>
      <View style={styles.plusHorizontal} />
      <View style={styles.plusVertical} />
    </GlassIconButton>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    height: 44,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    width: 44,
  },
  plusHorizontal: {
    backgroundColor: colors.icon,
    borderRadius: 1,
    height: 2,
    position: 'absolute',
    width: 16,
  },
  plusVertical: {
    backgroundColor: colors.icon,
    borderRadius: 1,
    height: 16,
    position: 'absolute',
    width: 2,
  },
  pressed: {
    opacity: 0.92,
  },
});
