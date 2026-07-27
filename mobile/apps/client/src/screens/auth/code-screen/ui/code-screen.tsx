/**
 * Экран ввода кода из SMS → `POST /auth/otp/verify` (M1.3, Figma auth flow).
 *
 * Таймер повторной отправки берётся из ответа сервера (`resendAfterSec`), а не задаётся
 * константой: сервер сам решает, как часто можно запрашивать код (`§20`).
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { isDevEnvironment } from '@nurtaxi/shared-core/shared/config';
import { formatCountdown, formatPhone, useCountdown } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import { selectDevCode, selectPendingPhone } from '@nurtaxi/shared-core/entities/session';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { useAppSelector } from '@/app/store/hooks';

import { WelcomeGradientBackground } from '../../welcome-screen/ui/welcome-gradient-background';
import { CodeOtpInput } from './code-otp-input';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const codeColors = {
  background: '#F8F4EF',
  title: '#2E2331',
  subtitle: '#7A6E78',
  link: '#3A1D3F',
  hint: '#A99FA6',
  buttonStart: '#5A2E60',
  buttonEnd: '#3A1D3F',
  buttonText: '#F7F3EE',
  buttonShadow: 'rgba(89,71,31,0.1)',
  devCardBg: 'rgba(255,248,230,0.85)',
  devCardBorder: 'rgba(201,154,84,0.35)',
  devCardText: '#7A6E78',
} as const;

const logoAsset = require('@/assets/images/welcome/logo.png');
const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');
const markGlowAsset = require('@/assets/images/welcome/mark-glow.png');
const iconGlowAsset = require('@/assets/images/welcome/icon-glow.png');

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

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const logoWidth = sx(164);
  const logoHeight = sx(199);
  const logoLeft = (width - logoWidth) / 2;
  const logoTop = Math.max(insets.top, sy(20)) + sy(76);
  const logoRenderHeight = logoHeight * 1.0017;
  const logoRenderWidth = logoWidth * 1.3507;
  const logoCropOffsetX = logoWidth * 0.3507;
  const glowSize = sx(150);
  const glowLeft = (width - glowSize) / 2;

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

      <Image
        contentFit="cover"
        pointerEvents="none"
        source={markGlowAsset}
        style={[
          styles.layer,
          {
            height: glowSize,
            left: glowLeft,
            top: logoTop - sy(122),
            width: glowSize,
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.logoClip,
          { height: logoHeight, left: logoLeft, top: logoTop, width: logoWidth },
        ]}
      >
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

      <Image
        contentFit="cover"
        pointerEvents="none"
        source={iconGlowAsset}
        style={[
          styles.layer,
          {
            height: glowSize,
            left: glowLeft,
            top: logoTop - sy(54),
            width: glowSize,
          },
        ]}
      />

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
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: sx(22), lineHeight: sx(28) }]}>
            {t('auth.codeTitle')}
          </Text>
          <Text
            style={[styles.subtitle, { fontSize: sx(14), lineHeight: sx(20), marginTop: sy(8) }]}
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
              <Text style={[styles.link, { fontSize: sx(14), opacity: isRequestingOtp ? 0.5 : 1 }]}>
                {t('auth.resend')}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.hint, { fontSize: sx(13) }]}>
              {t('auth.resendIn', { time: formatCountdown(secondsLeft) })}
            </Text>
          )}

          <Pressable onPress={() => router.replace('/(auth)/phone')}>
            <Text style={[styles.hint, { fontSize: sx(13) }]}>{t('auth.changeNumber')}</Text>
          </Pressable>

          {isDevEnvironment && devCode ? (
            <View
              style={[
                styles.devCard,
                {
                  borderRadius: sx(16),
                  marginTop: sy(8),
                  paddingHorizontal: sx(16),
                  paddingVertical: sy(12),
                },
              ]}
            >
              <Text style={[styles.devCardText, { fontSize: sx(13) }]}>
                {t('auth.devCodeHint', { code: devCode })}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => submit(code)}
          style={({ pressed }) => [
            styles.buttonWrap,
            {
              marginTop: sy(48),
              opacity: !canSubmit ? 0.45 : pressed ? 0.92 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[codeColors.buttonStart, codeColors.buttonEnd]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={[
              styles.button,
              {
                borderRadius: sx(29),
                height: sx(58),
                shadowColor: codeColors.buttonShadow,
              },
            ]}
          >
            <Text style={[styles.buttonText, { fontSize: sx(16) }]}>
              {isVerifyingOtp ? t('common.loading') : t('common.confirm')}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 9,
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
