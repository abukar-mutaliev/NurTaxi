import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const goBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          paddingTop: theme.spacing.lg,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={t('common.back')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={goBack}
      >
        <Text tone="primary" variant="body">
          ← {t('common.back')}
        </Text>
      </Pressable>
      <Text style={styles.title} variant="subtitle">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    flex: 1,
  },
});
