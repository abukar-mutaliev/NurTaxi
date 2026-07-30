/**
 * Экран ввода кода из SMS → `POST /auth/otp/verify` (M1.3).
 *
 * По макету кнопки подтверждения нет: как только введены все цифры, код уходит на проверку
 * автоматически. Таймер повторной отправки задаёт сервер (`resendAfterSec`, `§20`).
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { isDevEnvironment } from '@nurtaxi/shared-core/shared/config';
import { formatPhone, useCountdown } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import { selectDevCode, selectPendingPhone } from '@nurtaxi/shared-core/entities/session';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { useAppSelector } from '@/app/store/hooks';
import { RoundButton } from '@/shared/ui/round-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

import { CodeOtpInput } from './code-otp-input';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;
const OTP_LENGTH = 4;
const DEFAULT_RESEND_SECONDS = 30;

const c = {
  title: '#2E2331',
  subtitle: '#8A7E88',
  strong: '#2E2331',
  hint: '#B5AAB2',
  link: '#3A1D3F',
} as const;

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
    if (!phone || isRequestingOtp) {
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
      <ScreenGradientBackground tone="rose" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + sy(24),
          paddingHorizontal: sx(32),
          paddingTop: Math.max(insets.top, sy(32)) + sy(28),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RoundButton
          accessibilityLabel={t('common.back')}
          icon="back"
          onPress={() => router.replace('/(auth)/phone')}
          size={sx(44)}
        />

        <View style={{ marginTop: sy(28) }}>
          <Text style={[styles.title, { fontSize: sx(26), lineHeight: sx(32) }]}>
            {t('auth.codeTitle')}
          </Text>
          <Text style={[styles.subtitleLeft, { fontSize: sx(14), marginTop: sy(6) }]}>
            Отправили SMS на{' '}
            <Text style={[styles.strong, { fontSize: sx(14) }]}>
              {phone ? formatPhone(phone) : ''}
            </Text>
          </Text>
        </View>

        <View style={{ marginTop: sy(30) }}>
          <CodeOtpInput
            autoFocus
            editable={!isVerifyingOtp}
            error={error ?? undefined}
            length={OTP_LENGTH}
            onChange={setCode}
            onComplete={submit}
            scale={scale}
            value={code}
          />
        </View>

        <View style={{ alignItems: 'center', marginTop: sy(24) }}>
          {isFinished ? (
            <Pressable disabled={isRequestingOtp} hitSlop={8} onPress={resend}>
              <Text style={[styles.link, { fontSize: sx(14), opacity: isRequestingOtp ? 0.5 : 1 }]}>
                {t('auth.resend')}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.subtitle, { fontSize: sx(14) }]}>
              Отправить повторно через{' '}
              <Text style={[styles.strong, { fontSize: sx(14) }]}>{secondsLeft}</Text> с
            </Text>
          )}
        </View>

        {isDevEnvironment ? (
          <Text style={[styles.hint, { fontSize: sx(12), marginTop: sy(26) }]}>
            {devCode ? t('auth.devCodeHint', { code: devCode }) : 'Демо: введите любые 4 цифры'}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: c.hint,
    textAlign: 'center',
  },
  link: {
    color: c.link,
    fontWeight: '600',
    textAlign: 'center',
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  strong: {
    color: c.strong,
    fontWeight: '700',
  },
  subtitle: {
    color: c.subtitle,
    textAlign: 'center',
  },
  subtitleLeft: {
    color: c.subtitle,
  },
  title: {
    color: c.title,
    fontWeight: '700',
  },
});
