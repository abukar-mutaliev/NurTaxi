/**
 * Онбординг после первой регистрации: имя, фото, согласие 152-ФЗ (M1.7, `§8.1`).
 *
 * Без явного согласия кнопка завершения недоступна — это юридическое требование, а не UX-выбор.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';
import { useOnboarding } from '@nurtaxi/shared-core/features/auth';

import { WelcomeGradientBackground } from '../../welcome-screen/ui/welcome-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const onboardingColors = {
  background: '#F8F4EF',
  brand: '#3A1D3F',
  title: '#2E2331',
  subtitle: '#7A6E78',
  label: '#7A6E78',
  inputText: '#2E2331',
  inputPlaceholder: '#A99FA6',
  inputBg: 'rgba(255,255,255,0.72)',
  inputBorder: 'rgba(255,255,255,0.9)',
  dot: '#E8C882',
  buttonStart: '#5A2E60',
  buttonEnd: '#3A1D3F',
  buttonText: '#F7F3EE',
  inputShadow: 'rgba(89,71,31,0.06)',
  buttonShadow: 'rgba(89,71,31,0.1)',
  error: '#B42318',
  cardBg: 'rgba(255,255,255,0.82)',
  cardBorder: 'rgba(255,255,255,0.9)',
  cardBorderChecked: 'rgba(201,154,84,0.55)',
  cardShadow: 'rgba(89,71,31,0.06)',
  consentTitle: '#2E2331',
  consentText: '#7A6E78',
  consentAction: '#3A1D3F',
  checkBg: 'rgba(201,154,84,0.18)',
  checkMark: '#C99A54',
} as const;

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { completeOnboarding, isSubmitting, error } = useOnboarding();

  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const canSubmit = name.trim().length >= 2 && consent && !isSubmitting;
  const showPlaceholder = name.trim().length === 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <StatusBar style="dark" />
      <WelcomeGradientBackground />

      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseTopAsset}
        style={[
          styles.layer,
          {
            height: sx(520),
            left: sx(-65),
            top: sy(-140),
            width: sx(520),
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + sy(24),
            paddingHorizontal: sx(40),
            paddingTop: Math.max(insets.top, sy(20)) + sy(76),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: onboardingColors.dot,
                height: sx(16),
                marginBottom: sy(6),
                width: sx(16),
              },
            ]}
          />
          <Text style={[styles.brand, { fontSize: sx(40), lineHeight: sx(50) }]}>
            {t('auth.brandName')}
          </Text>
          <Text style={[styles.title, { fontSize: sx(22), lineHeight: sx(28), marginTop: sy(24) }]}>
            {t('onboarding.title')}
          </Text>
          <Text
            style={[styles.subtitle, { fontSize: sx(14), lineHeight: sx(20), marginTop: sy(8) }]}
          >
            {t('onboarding.subtitle')}
          </Text>
        </View>

        <View style={{ gap: sy(20), marginTop: sy(40) }}>
          <View style={{ gap: sy(8) }}>
            <Text style={[styles.fieldLabel, { fontSize: sx(13) }]}>
              {t('onboarding.nameLabel')}
            </Text>
            <View
              style={[
                styles.inputShell,
                {
                  backgroundColor: onboardingColors.inputBg,
                  borderColor: onboardingColors.inputBorder,
                  borderRadius: sx(18),
                  height: sx(58),
                  paddingHorizontal: sx(21),
                  shadowColor: onboardingColors.inputShadow,
                },
              ]}
            >
              <View style={styles.inputField}>
                {showPlaceholder ? (
                  <Text
                    pointerEvents="none"
                    style={[styles.inputPlaceholder, { fontSize: sx(16) }]}
                  >
                    {t('onboarding.namePlaceholder')}
                  </Text>
                ) : null}
                <TextInput
                  autoFocus
                  autoCapitalize="words"
                  autoCorrect={false}
                  onChangeText={setName}
                  returnKeyType="done"
                  style={[
                    styles.input,
                    {
                      color: onboardingColors.inputText,
                      fontSize: sx(16),
                    },
                  ]}
                  textContentType="name"
                  value={name}
                />
              </View>
            </View>
          </View>

          {/* TODO(M2.2): загрузка фото профиля через expo-image-picker. */}

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent((value) => !value)}
          >
            <View
              style={[
                styles.consentCard,
                {
                  borderColor: consent
                    ? onboardingColors.cardBorderChecked
                    : onboardingColors.cardBorder,
                  borderRadius: sx(20),
                  gap: sy(10),
                  paddingHorizontal: sx(18),
                  paddingVertical: sy(16),
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
                      backgroundColor: consent ? onboardingColors.checkBg : 'transparent',
                      borderColor: consent
                        ? onboardingColors.checkMark
                        : onboardingColors.inputPlaceholder,
                      borderRadius: sx(8),
                      height: sx(22),
                      width: sx(22),
                    },
                  ]}
                >
                  {consent ? <Text style={[styles.checkMark, { fontSize: sx(14) }]}>✓</Text> : null}
                </View>
                <Text style={[styles.consentAction, { fontSize: sx(14) }]}>
                  {t('common.confirm')}
                </Text>
              </View>
            </View>
          </Pressable>

          {error ? <Text style={[styles.error, { fontSize: sx(13) }]}>{error.message}</Text> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => completeOnboarding({ name: name.trim() })}
          style={({ pressed }) => [
            styles.buttonWrap,
            {
              marginTop: sy(48),
              opacity: !canSubmit ? 0.45 : pressed ? 0.92 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[onboardingColors.buttonStart, onboardingColors.buttonEnd]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={[
              styles.button,
              {
                borderRadius: sx(29),
                height: sx(58),
                shadowColor: onboardingColors.buttonShadow,
              },
            ]}
          >
            <Text style={[styles.buttonText, { fontSize: sx(16) }]}>
              {isSubmitting ? t('common.loading') : t('onboarding.finish')}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: onboardingColors.brand,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  buttonText: {
    color: onboardingColors.buttonText,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonWrap: {
    width: '100%',
  },
  checkBox: {
    alignItems: 'center',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  checkMark: {
    color: onboardingColors.checkMark,
    fontWeight: '700',
    lineHeight: 16,
  },
  consentAction: {
    color: onboardingColors.consentAction,
    fontWeight: '600',
  },
  consentActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  consentCard: {
    backgroundColor: onboardingColors.cardBg,
    borderWidth: 1,
    elevation: 2,
    shadowColor: onboardingColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  consentText: {
    color: onboardingColors.consentText,
  },
  consentTitle: {
    color: onboardingColors.consentTitle,
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
  },
  dot: {
    borderRadius: 999,
  },
  error: {
    color: onboardingColors.error,
    textAlign: 'center',
  },
  fieldLabel: {
    color: onboardingColors.label,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontWeight: '500',
    padding: 0,
  },
  inputField: {
    flex: 1,
    justifyContent: 'center',
  },
  inputPlaceholder: {
    color: onboardingColors.inputPlaceholder,
    fontWeight: '500',
    left: 0,
    position: 'absolute',
    top: 0,
  },
  inputShell: {
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    width: '100%',
  },
  layer: {
    position: 'absolute',
  },
  root: {
    backgroundColor: onboardingColors.background,
    flex: 1,
  },
  subtitle: {
    color: onboardingColors.subtitle,
    textAlign: 'center',
  },
  title: {
    color: onboardingColors.title,
    fontWeight: '600',
    textAlign: 'center',
  },
});
