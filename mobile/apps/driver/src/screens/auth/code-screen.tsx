/** Экран ввода кода из SMS водителя → `POST /auth/otp/verify` (M1.3). */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatCountdown, formatPhone, useCountdown } from '@nurtaxi/shared-core/shared/lib';
import { Button, Card, OtpInput, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { isDevEnvironment } from '@nurtaxi/shared-core/shared/config';
import { selectDevCode, selectPendingPhone } from '@nurtaxi/shared-core/entities/session';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { useAppSelector } from '@/app/store/hooks';

const OTP_LENGTH = 4;
const DEFAULT_RESEND_SECONDS = 60;

export function CodeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const phone = useAppSelector(selectPendingPhone);
  const devCode = useAppSelector(selectDevCode);

  const { verifyOtp, requestOtp, isVerifyingOtp, isRequestingOtp } = useAuth();
  const { secondsLeft, isFinished, restart } = useCountdown(DEFAULT_RESEND_SECONDS);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        // Дальше guard решает: онбординг / верификация / линия.
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
    <Screen
      footer={
        <Button
          disabled={code.length < OTP_LENGTH || isVerifyingOtp}
          loading={isVerifyingOtp}
          onPress={() => submit(code)}
          title="Подтвердить"
        />
      }
    >
      <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.xxl }}>
        <Text variant="title">Введите код</Text>
        <Text tone="muted">Отправили SMS на {phone ? formatPhone(phone) : ''}</Text>
      </View>

      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
        <OtpInput
          error={error ?? undefined}
          length={OTP_LENGTH}
          onChange={setCode}
          onComplete={submit}
          value={code}
        />

        {isFinished ? (
          <Pressable disabled={isRequestingOtp} onPress={resend}>
            <Text align="center" tone="primary" variant="bodyStrong">
              Отправить код повторно
            </Text>
          </Pressable>
        ) : (
          <Text align="center" tone="muted" variant="caption">
            Отправить повторно через {formatCountdown(secondsLeft)}
          </Text>
        )}

        {isDevEnvironment && devCode ? (
          <Card tone="warning">
            <Text variant="caption">Код для теста (dev): {devCode}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
