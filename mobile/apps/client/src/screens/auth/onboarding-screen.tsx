/**
 * Онбординг после первой регистрации: имя, фото, согласие 152-ФЗ (M1.7, `§8.1`).
 *
 * Без явного согласия кнопка завершения недоступна — это юридическое требование, а не UX-выбор.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Input, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useOnboarding } from '@nurtaxi/shared-core/features/auth';

export function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { completeOnboarding, isSubmitting, error } = useOnboarding();

  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);

  const canSubmit = name.trim().length >= 2 && consent && !isSubmitting;

  return (
    <Screen
      footer={
        <Button
          disabled={!canSubmit}
          loading={isSubmitting}
          onPress={() => completeOnboarding({ name: name.trim() })}
          title={t('onboarding.finish')}
        />
      }
      scroll
    >
      <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.xxl }}>
        <Text variant="title">{t('onboarding.title')}</Text>
        <Text tone="muted">{t('onboarding.subtitle')}</Text>
      </View>

      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
        <Input
          autoFocus
          label={t('onboarding.nameLabel')}
          onChangeText={setName}
          placeholder={t('onboarding.namePlaceholder')}
          value={name}
        />

        {/* TODO(M2.2): загрузка фото профиля через expo-image-picker. */}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          onPress={() => setConsent((value) => !value)}
        >
          <Card tone={consent ? 'success' : 'muted'}>
            <Text variant="label">{t('onboarding.consentTitle')}</Text>
            <Text variant="caption">{t('onboarding.consentText')}</Text>
            <Text tone="primary" variant="label">
              {consent ? '✓ ' : ''}
              {t('common.confirm')}
            </Text>
          </Card>
        </Pressable>

        {error ? (
          <Text tone="danger" variant="caption">
            {error.message}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
