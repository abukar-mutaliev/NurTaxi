/** Экран ввода телефона водителя → `POST /auth/otp/request` (M1.2). */
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { applyPhoneMask, isValidPhone } from '@nurtaxi/shared-core/shared/lib';
import { Button, Input, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

export function PhoneScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { requestOtp, isRequestingOtp } = useAuth();

  const [phone, setPhone] = useState('+7 ');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isValidPhone(phone) && !isRequestingOtp;

  const submit = async () => {
    setError(null);
    try {
      await requestOtp(phone);
      router.push('/(auth)/code');
    } catch (cause) {
      setError(toAppError(cause as never).message);
    }
  };

  return (
    <Screen
      footer={
        <Button
          disabled={!canSubmit}
          loading={isRequestingOtp}
          onPress={submit}
          title="Получить код"
        />
      }
    >
      <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.xxl }}>
        <Text variant="title">Вход для водителей</Text>
        <Text tone="muted">Введите номер телефона</Text>
      </View>

      <View style={{ paddingTop: theme.spacing.xl }}>
        <Input
          autoFocus
          error={error ?? undefined}
          keyboardType="phone-pad"
          label="Телефон"
          onChangeText={(value) => {
            setPhone(applyPhoneMask(value));
            setError(null);
          }}
          onSubmitEditing={canSubmit ? submit : undefined}
          returnKeyType="done"
          textContentType="telephoneNumber"
          value={phone}
        />
      </View>

      <Text tone="muted" variant="caption" style={{ paddingTop: theme.spacing.lg }}>
        Регистрация в качестве водителя доступна только женщинам (Req §10).
      </Text>
    </Screen>
  );
}
