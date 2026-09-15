import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from './glass-shadow';
import { GLASS_COLORS } from './glass-theme';

export interface GlassPrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingTitle?: string;
  scale?: number;
  variant?: 'primary' | 'secondary' | 'destructive';
}

export function GlassPrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingTitle,
  scale = 1,
  variant = 'primary',
}: GlassPrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const label = loading ? (loadingTitle ?? title) : title;

  if (variant === 'secondary') {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.secondary,
          {
            borderRadius: scale * 29,
            height: scale * 52,
            opacity: isDisabled ? 0.45 : pressed ? 0.92 : 1,
          },
        ]}
      >
        <Text style={[styles.secondaryText, { fontSize: scale * 15 }]}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === 'destructive') {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.destructive,
          {
            borderRadius: scale * 29,
            height: scale * 58,
            opacity: isDisabled ? 0.45 : pressed ? 0.92 : 1,
          },
        ]}
      >
        <Text style={[styles.destructiveText, { fontSize: scale * 16 }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { opacity: isDisabled ? 0.45 : pressed ? 0.92 : 1 }]}
    >
      <LinearGradient
        colors={[GLASS_COLORS.buttonStart, GLASS_COLORS.buttonEnd]}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={[
          styles.button,
          {
            borderRadius: scale * 29,
            height: scale * 58,
          },
        ]}
      >
        <Text style={[styles.buttonText, { fontSize: scale * 16 }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    ...glassShadow({
      color: GLASS_COLORS.buttonShadow,
      offset: { width: 0, height: 6 },
      radius: 9,
    }),
    width: '100%',
  },
  buttonText: {
    color: GLASS_COLORS.buttonText,
    fontWeight: '600',
    textAlign: 'center',
  },
  destructive: {
    alignItems: 'center',
    backgroundColor: GLASS_COLORS.error,
    elevation: 3,
    justifyContent: 'center',
    ...glassShadow({ color: GLASS_COLORS.shadow, offset: { width: 0, height: 6 }, radius: 9 }),
    width: '100%',
  },
  destructiveText: {
    color: GLASS_COLORS.buttonText,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondary: {
    alignItems: 'center',
    backgroundColor: GLASS_COLORS.cardBg,
    borderColor: GLASS_COLORS.cardBorder,
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    ...glassShadow({ color: GLASS_COLORS.shadow }),
    width: '100%',
  },
  secondaryText: {
    color: GLASS_COLORS.title,
    fontWeight: '600',
    textAlign: 'center',
  },
  wrap: {
    width: '100%',
  },
});
