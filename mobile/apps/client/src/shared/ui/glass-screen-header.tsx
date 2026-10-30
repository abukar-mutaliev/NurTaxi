import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { brandColors, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { Chevron } from './chevron';
import { glassShadow } from './glass-shadow';

const colors = {
  glassBg: brandColors.surface,
  glassBorder: brandColors.divider,
  shadow: brandColors.shadow,
  title: brandColors.text,
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
          <Chevron color={colors.title} />
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
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    height: 44,
    justifyContent: 'center',
    ...glassShadow({ color: colors.shadow }),
    width: 44,
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
    fontSize: typeScale.xl,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 24,
    textAlign: 'center',
  },
});
