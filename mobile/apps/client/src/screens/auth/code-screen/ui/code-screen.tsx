/**
 * Экран ввода кода из SMS → `POST /auth/otp/verify` (M1.3, Figma auth flow).
 *
 * Таймер повторной отправки берётся из ответа сервера (`resendAfterSec`), а не задаётся
 * константой: сервер сам решает, как часто можно запрашивать код (`§20`).
 */
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { isProdEnvironment } from '@nurtaxi/shared-core/shared/config';
import { formatCountdown, formatPhone, useCountdown } from '@nurtaxi/shared-core/shared/lib';
import { brandColors, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';
import { selectDevCode, selectPendingPhone } from '@nurtaxi/shared-core/entities/session';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { useAppSelector } from '@/app/store/hooks';
import { useKeyboardLift } from '@/shared/hooks/use-keyboard-lift';
import { glassShadow } from '@/shared/ui/glass-shadow';

import { WelcomeGradientBackground } from '../../welcome-screen/ui/welcome-gradient-background';
import { CodeOtpInput } from './code-otp-input';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const codeColors = {
  background: brandColors.background,
  title: brandColors.text,
  subtitle: brandColors.textMuted,
  link: brandColors.primary,
  hint: brandColors.textMuted,
  buttonStart: brandColors.primary,
  buttonEnd: brandColors.primary,
  buttonText: brandColors.onPrimary,
  buttonShadow: brandColors.shadow,
  devCardBg: brandColors.secondarySoft,
  devCardBorder: brandColors.secondary,
  devCardText: brandColors.textMuted,
} as const;

const logoAsset = require('@/assets/images/welcome/logo.png');

const OTP_LENGTH = 4;
const DEFAULT_RESEND_SECONDS = 60;

export function CodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const phone = useAppSelector(selectPendingPhone);
  const devCode = useAppSelector(selectDevCode);

  const { verifyOtp, requestOtp, isVerifyingOtp, isRequestingOtp } = useAuth();
  const { secondsLeft, isFinished, restart } = useCountdown(DEFAULT_RESEND_SECONDS);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Поле и кнопка — над клавиатурой, заголовок — не выше статус-бара (`useKeyboardLift`).
  const { anchorRef, ceilingRef, liftStyle } = useKeyboardLift();

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const logoWidth = sx(164);
  const logoHeight = sx(199);
  const logoLeft = (width - logoWidth) / 2;
  const logoTop = Math.max(insets.top, sy(20)) + sy(76);
  const canSubmit = code.length >= OTP_LENGTH && !isVerifyingOtp;

  useEffect(() => {
    if (!phone) {
      router.replace('/(auth)/phone');
    }
  }, [phone, router]);

  const submit = useCallback(
    async (value: string) => {
      if (!phone) {
        return;
      }
      setError(null);
      try {
        await verifyOtp(phone, value);
      } catch (cause) {
        setCode('');
        setError(toAppError(cause as never).message);
      }
    },
    [phone, verifyOtp],
  );

  const resend = async () => {
    if (!phone) {
      return;
    }
    setError(null);
    setCode('');
    const result = await requestOtp(phone);
    restart(result.resendAfterSec || DEFAULT_RESEND_SECONDS);
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

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: insets.bottom + sy(24),
              paddingHorizontal: sx(40),
              paddingTop: logoTop + logoHeight + sy(24),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View collapsable={false} ref={ceilingRef} style={styles.header}>
            <Text style={[styles.title, { fontSize: sx(typeScale.xxl), lineHeight: sx(32) }]}>
              {t('auth.codeTitle')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { fontSize: sx(typeScale.md), lineHeight: sx(20), marginTop: sy(8) },
              ]}
            >
              {t('auth.codeSubtitle', { phone: phone ? formatPhone(phone) : '' })}
            </Text>
          </View>

          <View style={{ gap: sy(16), marginTop: sy(40) }}>
            <CodeOtpInput
              autoFocus
              error={error ?? undefined}
              length={OTP_LENGTH}
              onChange={setCode}
              onComplete={submit}
              scale={scale}
              value={code}
            />

            {isFinished ? (
              <Pressable disabled={isRequestingOtp} onPress={resend}>
                <Text
                  style={[
                    styles.link,
                    { fontSize: sx(typeScale.md), opacity: isRequestingOtp ? 0.5 : 1 },
                  ]}
                >
                  {t('auth.resend')}
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.hint, { fontSize: sx(typeScale.sm) }]}>
                {t('auth.resendIn', { time: formatCountdown(secondsLeft) })}
              </Text>
            )}

            <Pressable onPress={() => router.replace('/(auth)/phone')}>
              <Text style={[styles.hint, { fontSize: sx(typeScale.sm) }]}>
                {t('auth.changeNumber')}
              </Text>
            </Pressable>

            {!isProdEnvironment && devCode ? (
              <View
                style={[
                  styles.devCard,
                  {
                    borderRadius: sx(radius.lg),
                    marginTop: sy(8),
                    paddingHorizontal: sx(16),
                    paddingVertical: sy(12),
                  },
                ]}
              >
                <Text style={[styles.devCardText, { fontSize: sx(typeScale.sm) }]}>
                  {t('auth.devCodeHint', { code: devCode })}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            collapsable={false}
            disabled={!canSubmit}
            onPress={() => submit(code)}
            ref={anchorRef}
            style={({ pressed }) => [
              styles.buttonWrap,
              {
                marginTop: sy(48),
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
                { backgroundColor: codeColors.buttonStart },
              ]}
            >
              <Text style={[styles.buttonText, { fontSize: sx(typeScale.base) }]}>
                {isVerifyingOtp ? t('common.loading') : t('common.confirm')}
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    ...glassShadow({ color: codeColors.buttonShadow, offset: { width: 0, height: 6 }, radius: 9 }),
  },
  buttonText: {
    color: codeColors.buttonText,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonWrap: {
    width: '100%',
  },
  content: {
    flexGrow: 1,
  },
  devCard: {
    backgroundColor: codeColors.devCardBg,
    borderColor: codeColors.devCardBorder,
    borderWidth: 1,
  },
  devCardText: {
    color: codeColors.devCardText,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
  },
  hint: {
    color: codeColors.hint,
    textAlign: 'center',
  },
  layer: {
    position: 'absolute',
  },
  logoClip: {
    overflow: 'hidden',
    position: 'absolute',
  },
  link: {
    color: codeColors.link,
    fontWeight: '600',
    textAlign: 'center',
  },
  root: {
    backgroundColor: codeColors.background,
    flex: 1,
  },
  subtitle: {
    color: codeColors.subtitle,
    textAlign: 'center',
  },
  title: {
    color: codeColors.title,
    fontWeight: '600',
    textAlign: 'center',
  },
});
