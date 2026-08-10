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
import { applyPhoneMask, isValidPhone } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { PillButton } from '@/shared/ui/pill-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const logoAsset = require('@/assets/images/welcome/logo.png');

const LOGO_DESIGN_WIDTH = 164;
const LOGO_DESIGN_HEIGHT = 199;

const c = {
  title: '#2E2331',
  subtitle: '#9A8F98',
  dot: '#DFAE5C',
  inputBg: '#FFFFFF',
  inputBorder: '#F0E7DC',
  inputText: '#2E2331',
  placeholder: '#B9AFB6',
  shadow: 'rgba(89,71,31,0.10)',
  danger: '#B42318',
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

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const logoWidth = sx(LOGO_DESIGN_WIDTH);
  const logoHeight = sx(LOGO_DESIGN_HEIGHT);
  /** В ассете знак смещён вправо (~63% ширины). Обрезаем слева, чтобы марка была по центру. */
  const logoRenderHeight = logoHeight * 1.0017;
  const logoRenderWidth = logoWidth * 1.3507;
  const logoCropOffsetX = logoWidth * 0.3507;

  const canSubmit = isValidPhone(phone) && !isRequestingOtp;

  const submit = async () => {
    if (!canSubmit) {
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
          <View style={[styles.logoClip, { height: logoHeight, width: logoWidth }]}>
            <Image
              contentFit="fill"
              source={logoAsset}
              style={{
                height: logoRenderHeight,
                marginLeft: -logoCropOffsetX,
                width: logoRenderWidth,
              }}
            />
          </View>
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
              {
                borderRadius: sx(18),
                gap: sx(12),
                height: sx(58),
                paddingHorizontal: sx(20),
              },
            ]}
          >
            <View
              style={{
                backgroundColor: c.dot,
                borderRadius: sx(8),
                height: sx(16),
                width: sx(16),
              }}
            />
            <TextInput
              autoFocus
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setPhone(normalizePhoneInput(value));
                setError(null);
              }}
              onSubmitEditing={canSubmit ? submit : undefined}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor={c.placeholder}
              returnKeyType="done"
              style={[styles.input, { fontSize: sx(16) }]}
              textContentType="telephoneNumber"
              value={phone}
            />
          </View>

          {error ? (
            <Text style={[styles.error, { fontSize: sx(13), marginTop: sy(10) }]}>{error}</Text>
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
  logoClip: {
    overflow: 'hidden',
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
