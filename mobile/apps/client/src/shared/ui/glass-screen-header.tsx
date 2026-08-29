import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  glassBg: 'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  title: '#2E2331',
} as const;

export interface GlassScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  showBack?: boolean;
}

export function GlassScreenHeader({
  title,
  onBack,
  rightAction,
  showBack = true,
}: GlassScreenHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const goBack = onBack ?? (() => router.back());

  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {rightAction ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
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
  backIcon: {
    color: colors.title,
    fontSize: 28,
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: 28,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spacer: {
    width: 44,
  },
  title: {
    color: colors.title,
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 24,
    textAlign: 'center',
  },
});
