/**
 * Экран входа водителя → `POST /auth/otp/request` (M1.2).
 *
 * Вёрстка повторяет макет: логотип «Нур», приветствие, поле телефона в виде белой
 * «пилюли» с золотой точкой и градиентная кнопка.
 */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { applyPhoneMask, isMobilePhone, normalizePhone } from '@nurtaxi/shared-core/shared/lib';
import { brandColors, Text } from '@nurtaxi/shared-core/shared/ui';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { PillButton } from '@/shared/ui/pill-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const logoAsset = require('@/assets/images/welcome/logo.png');
/** Знак без подписи: в поле ввода 24 px текст логотипа всё равно нечитаем. */
const logoMarkAsset = require('@/assets/images/welcome/logo-mark.png');

const LOGO_DESIGN_WIDTH = 164;
const LOGO_DESIGN_HEIGHT = 199;

const c = {
  title: brandColors.text,
  subtitle: brandColors.textMuted,
  inputBg: brandColors.surface,
  inputBorder: brandColors.surfaceMuted,
  inputText: brandColors.text,
  placeholder: brandColors.textMuted,
  shadow: brandColors.shadow,
  danger: brandColors.danger,
} as const;

/** Пустая маска не должна оставлять в поле висящий префикс «+7 ». */
const normalizePhoneInput = (value: string) => {
  const masked = applyPhoneMask(value);
  return masked === '+7 ' ? '' : masked;
};

export function PhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { requestOtp, isRequestingOtp } = useAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formatError, setFormatError] = useState(false);

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const logoWidth = sx(LOGO_DESIGN_WIDTH);
  const logoHeight = sx(LOGO_DESIGN_HEIGHT);

  // Кнопка доступна с первой цифры: так нажатие на неполный номер объясняет, что не так,
  // а не выглядит как неработающая кнопка.
  const canSubmit = phone !== '' && !isRequestingOtp;
  const message = formatError ? t('auth.phoneInvalid') : error;

  const changePhone = (value: string) => {
    const next = normalizePhoneInput(value);
    setPhone(next);
    setError(null);
    // Пока номер набирается, не ругаемся; набран целиком, но не мобильный — говорим сразу.
    setFormatError(normalizePhone(next).length === 12 && !isMobilePhone(next));
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    if (!isMobilePhone(phone)) {
      setFormatError(true);
      return;
    }
    setError(null);
    try {
      await requestOtp(phone);
      router.push('/(auth)/code');
    } catch (cause) {
      setError(toAppError(cause as never).message);
    }
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
          paddingTop: Math.max(insets.top, sy(20)) + sy(24),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {/*
            Ассет обрезан по краям знака, поэтому `contain` вписывает логотип в бокс
            макета целиком. Ручной сдвиг слева срезал «ЖЕ» из «ЖЕНСКОЕ ТАКСИ».
          */}
          <Image
            accessibilityLabel={t('auth.brandName')}
            contentFit="contain"
            source={logoAsset}
            style={{ height: logoHeight, width: logoWidth }}
          />
          <Text style={[styles.title, { fontSize: sx(19), marginTop: sy(16) }]}>
            {t('auth.phoneTitle')}
          </Text>
          <Text style={[styles.subtitle, { fontSize: sx(13), marginTop: sy(4) }]}>
            {t('auth.phoneSubtitle')}
          </Text>
        </View>

        <View style={{ marginTop: sy(40) }}>
          <View
            style={[
              styles.inputShell,
              formatError && styles.inputShellInvalid,
              {
                borderRadius: sx(18),
                gap: sx(12),
                height: sx(58),
                paddingHorizontal: sx(20),
              },
            ]}
          >
            <Image
              accessibilityLabel={t('auth.brandName')}
              contentFit="contain"
              source={logoMarkAsset}
              style={{ height: sx(26), width: sx(24) }}
            />
            <TextInput
              accessibilityHint={formatError ? t('auth.phoneInvalid') : undefined}
              autoFocus
              keyboardType="phone-pad"
              onChangeText={changePhone}
              onSubmitEditing={submit}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor={c.placeholder}
              returnKeyType="done"
              style={[styles.input, { fontSize: sx(16) }]}
              textContentType="telephoneNumber"
              value={phone}
            />
          </View>

          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.error, { fontSize: sx(13), marginTop: sy(10) }]}
            >
              {message}
            </Text>
          ) : null}
        </View>

        <PillButton
          disabled={!canSubmit}
          height={sx(58)}
          loading={isRequestingOtp}
          onPress={submit}
          style={{ marginTop: sy(56) }}
          title={t('auth.getCode')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  inputShellInvalid: {
    borderColor: c.danger,
  },
  root: {
    backgroundColor: brandColors.background,
    flex: 1,
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
