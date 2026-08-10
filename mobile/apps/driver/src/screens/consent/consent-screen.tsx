/**
 * Согласие на обработку персональных данных (M1.7, `§8.1`).
 *
 * Шаг между входом по коду и анкетой водителя: сервер держит профиль в состоянии
 * «требуется онбординг», пока не получит имя и согласие по 152-ФЗ, и до этого не пускает
 * дальше. Без отмеченного согласия кнопка недоступна — это юридическое требование,
 * а не UX-выбор, поэтому «пропустить» здесь нет.
 *
 * Имя спрашиваем здесь же: `PATCH /me` требует его вместе с согласием. В анкете водителя
 * ФИО подставится из профиля, так что дважды вводить одно и то же не придётся.
 */
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';
import { useOnboarding } from '@nurtaxi/shared-core/features/auth';

import { PillButton } from '@/shared/ui/pill-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const MIN_NAME_LENGTH = 2;

const logoMarkAsset = require('@/assets/images/welcome/logo-mark.png');

const c = {
  title: '#2E2331',
  subtitle: '#9A8F98',
  inputBg: '#FFFFFF',
  inputBorder: '#F0E7DC',
  inputText: '#2E2331',
  placeholder: '#B9AFB6',
  shadow: 'rgba(89,71,31,0.10)',
  danger: '#B42318',
  consentBorder: '#EFE4D6',
  consentBorderActive: '#3A1D3F',
  consentText: '#7A6E78',
  checkBg: '#3A1D3F',
} as const;

export function ConsentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { completeOnboarding, isSubmitting, error } = useOnboarding();

  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const canSubmit = name.trim().length >= MIN_NAME_LENGTH && consent && !isSubmitting;

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    void completeOnboarding({ name: name.trim() });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <StatusBar style="dark" />
      <ScreenGradientBackground tone="gold" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + sy(24),
          paddingHorizontal: sx(40),
          paddingTop: Math.max(insets.top, sy(20)) + sy(32),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            accessibilityLabel={t('auth.brandName')}
            contentFit="contain"
            source={logoMarkAsset}
            style={{ height: sy(96), width: sx(90) }}
          />
          <Text style={[styles.title, { fontSize: sx(19), marginTop: sy(20) }]}>
            {t('onboarding.title')}
          </Text>
          <Text style={[styles.subtitle, { fontSize: sx(13), marginTop: sy(4) }]}>
            {t('onboarding.subtitle')}
          </Text>
        </View>

        <View style={{ marginTop: sy(36) }}>
          <View
            style={[
              styles.inputShell,
              { borderRadius: sx(18), height: sx(58), paddingHorizontal: sx(20) },
            ]}
          >
            <TextInput
              autoCapitalize="words"
              autoFocus
              onChangeText={setName}
              onSubmitEditing={submit}
              placeholder={t('onboarding.namePlaceholder')}
              placeholderTextColor={c.placeholder}
              returnKeyType="done"
              style={[styles.input, { fontSize: sx(16) }]}
              textContentType="name"
              value={name}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          onPress={() => setConsent((current) => !current)}
          style={[
            styles.consentCard,
            {
              borderColor: consent ? c.consentBorderActive : c.consentBorder,
              borderRadius: sx(18),
              gap: sy(8),
              marginTop: sy(24),
              padding: sx(18),
            },
          ]}
        >
          <Text style={[styles.consentTitle, { fontSize: sx(15) }]}>
            {t('onboarding.consentTitle')}
          </Text>
          <Text style={[styles.consentText, { fontSize: sx(13), lineHeight: sx(18) }]}>
            {t('onboarding.consentText')}
          </Text>

          <View style={[styles.consentActionRow, { gap: sx(10), marginTop: sy(4) }]}>
            <View
              style={[
                styles.checkBox,
                {
                  backgroundColor: consent ? c.checkBg : 'transparent',
                  borderColor: consent ? c.checkBg : c.consentBorder,
                  borderRadius: sx(6),
                  height: sx(22),
                  width: sx(22),
                },
              ]}
            >
              {consent ? <Text style={[styles.checkMark, { fontSize: sx(14) }]}>✓</Text> : null}
            </View>
            <Text style={[styles.consentAgree, { fontSize: sx(14) }]}>Согласен(на)</Text>
          </View>
        </Pressable>

        {error ? (
          <Text style={[styles.error, { fontSize: sx(13), marginTop: sy(12) }]}>
            {error.message}
          </Text>
        ) : null}

        <View style={styles.spacer} />

        <PillButton
          disabled={!canSubmit}
          height={sx(58)}
          loading={isSubmitting}
          onPress={submit}
          style={{ marginTop: sy(24) }}
          title={t('onboarding.finish')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  checkBox: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  consentActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  consentAgree: {
    color: c.title,
    fontWeight: '600',
  },
  consentCard: {
    backgroundColor: c.inputBg,
    borderWidth: 1.5,
  },
  consentText: {
    color: c.consentText,
  },
  consentTitle: {
    color: c.title,
    fontWeight: '600',
  },
  error: {
    color: c.danger,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
  },
  input: {
    color: c.inputText,
    flex: 1,
    fontWeight: '500',
    padding: 0,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: c.inputBg,
    borderColor: c.inputBorder,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  subtitle: {
    color: c.subtitle,
    textAlign: 'center',
  },
  title: {
    color: c.title,
    fontWeight: '700',
    textAlign: 'center',
  },
});
