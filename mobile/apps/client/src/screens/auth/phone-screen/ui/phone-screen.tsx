/** Экран ввода телефона → `POST /auth/otp/request` (M1.2, Figma node 39:1104). */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@nurtaxi/shared-core/features/auth';
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { applyPhoneMask, isMobilePhone, normalizePhone } from '@nurtaxi/shared-core/shared/lib';
import { brandColors, fontFamily, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { useKeyboardLift } from '@/shared/hooks/use-keyboard-lift';
import { glassShadow } from '@/shared/ui/glass-shadow';

import { WelcomeGradientBackground } from '../../welcome-screen/ui/welcome-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const phoneColors = {
  background: brandColors.background,
  title: brandColors.text,
  subtitle: brandColors.textMuted,
  inputText: brandColors.text,
  inputPlaceholder: brandColors.textMuted,
  inputBg: brandColors.surface,
  inputBorder: brandColors.divider,
  iconOuter: brandColors.primary,
  iconAccent: brandColors.primary,
  buttonStart: brandColors.primary,
  buttonEnd: brandColors.primary,
  buttonText: brandColors.onPrimary,
  inputShadow: brandColors.shadow,
  buttonShadow: brandColors.shadow,
  error: brandColors.danger,
} as const;

const logoAsset = require('@/assets/images/welcome/logo.png');

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
  // Поле и кнопка должны оставаться над клавиатурой — см. `useKeyboardLift`.
  const { anchorRef, liftStyle } = useKeyboardLift();

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const logoWidth = sx(164);
  const logoHeight = sx(199);
  const logoLeft = (width - logoWidth) / 2;
  const logoTop = Math.max(insets.top, sy(20)) + sy(76);
  const headerTop = logoTop + logoHeight + sy(24);
  // Низ подзаголовка: заголовок 28 + отступ + подзаголовок 20 (в масштабе макета).
  const headerBottom = headerTop + sx(28) + sy(2) + sx(20);
  /**
   * Форма — по макету, но не выше подзаголовка. Заголовок отсчитывается от выреза под
   * камеру, и на телефонах с высоким вырезом поле ввода наезжало на «Войдите, чтобы продолжить».
   */
  const formTop = Math.max(sy(364), headerBottom + sy(20));

  // Кнопка доступна с первой цифры: нажатие на неполный номер объясняет, что не так.
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
    <View style={styles.root}>
      <StatusBar style="dark" />

      <WelcomeGradientBackground />

      {/* Передний план поднимается над клавиатурой целиком, фон остаётся на месте. */}
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, liftStyle]}>
        <View
          pointerEvents="none"
          style={[
            styles.logoClip,
            { height: logoHeight, left: logoLeft, top: logoTop, width: logoWidth },
          ]}
        >
          <Image
            contentFit="contain"
            source={logoAsset}
            style={{ height: logoHeight, width: logoWidth }}
          />
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.header,
            {
              paddingTop: headerTop,
            },
          ]}
        >
          <Text style={[styles.title, { fontSize: sx(typeScale.xxl), lineHeight: sx(32) }]}>
            {t('auth.phoneTitle')}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { fontSize: sx(typeScale.md), lineHeight: sx(20), marginTop: sy(2) },
            ]}
          >
            {t('auth.phoneSubtitle')}
          </Text>
        </View>

        <View
          collapsable={false}
          ref={anchorRef}
          style={[
            styles.form,
            {
              paddingHorizontal: sx(40),
              top: formTop,
            },
          ]}
        >
          <View
            style={[
              styles.inputShell,
              {
                backgroundColor: phoneColors.inputBg,
                borderColor: formatError ? phoneColors.error : phoneColors.inputBorder,
                borderRadius: sx(radius.lg),
                gap: sx(14),
                height: sx(58),
                paddingHorizontal: sx(21),
              },
            ]}
          >
            <View
              style={[
                styles.inputIconOuter,
                {
                  height: sx(36),
                  width: sx(36),
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'phone.fill', android: 'phone', web: 'phone' }}
                resizeMode="scaleAspectFit"
                size={sx(18)}
                tintColor={phoneColors.iconAccent}
                type="monochrome"
                weight={{ ios: 'medium', android: medium }}
              />
            </View>
            <View style={styles.inputField}>
              <TextInput
                accessibilityHint={formatError ? t('auth.phoneInvalid') : undefined}
                autoFocus
                keyboardType="phone-pad"
                onChangeText={changePhone}
                onSubmitEditing={submit}
                placeholder={t('auth.phonePlaceholder')}
                placeholderTextColor={phoneColors.inputPlaceholder}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    color: phoneColors.inputText,
                    fontSize: sx(typeScale.base),
                  },
                ]}
                textContentType="telephoneNumber"
                value={phone}
              />
            </View>
          </View>

          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.error,
                {
                  fontSize: sx(typeScale.sm),
                  marginTop: sy(8),
                },
              ]}
            >
              {message}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [
              styles.buttonWrap,
              {
                marginTop: sy(message ? 24 : 112),
                opacity: !canSubmit ? 0.45 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.button,
                {
                  borderRadius: sx(radius.xxl),
                  height: sx(58),
                },
                { backgroundColor: phoneColors.buttonStart },
              ]}
            >
              <Text style={[styles.buttonText, { fontSize: sx(typeScale.base) }]}>
                {isRequestingOtp ? t('common.loading') : t('auth.getCode')}
              </Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    ...glassShadow({ color: phoneColors.buttonShadow, offset: { width: 0, height: 6 }, radius: 9 }),
  },
  buttonText: {
    color: phoneColors.buttonText,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonWrap: {
    width: '100%',
  },
  error: {
    color: phoneColors.error,
    textAlign: 'center',
  },
  form: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  header: {
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.medium,
    padding: 0,
  },
  inputIconOuter: {
    alignItems: 'center',
    backgroundColor: phoneColors.iconOuter,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    justifyContent: 'center',
  },
  inputShell: {
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    ...glassShadow({ color: phoneColors.inputShadow }),
    width: '100%',
  },
  layer: {
    position: 'absolute',
  },
  logoClip: {
    overflow: 'hidden',
    position: 'absolute',
  },
  root: {
    backgroundColor: phoneColors.background,
    flex: 1,
  },
  subtitle: {
    color: phoneColors.subtitle,
    fontWeight: '400',
    textAlign: 'center',
  },
  title: {
    color: phoneColors.title,
    fontWeight: '600',
    textAlign: 'center',
  },
});
