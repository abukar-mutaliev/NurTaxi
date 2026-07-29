/** Экран ввода телефона водителя → `POST /auth/otp/request` (M1.2, Figma node 39:1104). */
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { applyPhoneMask, isValidPhone } from '@nurtaxi/shared-core/shared/lib';
import { Button, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

const logoAsset = require('@/assets/images/welcome/logo.png');

const DOT_COLOR = '#E8C882';
const INPUT_BG = '#FFFFFF';
const INPUT_BORDER = '#EDE4D6';
const INPUT_TEXT = '#2E2331';
const INPUT_PLACEHOLDER = '#A99FA6';

const normalizePhoneInput = (value: string) => {
  const masked = applyPhoneMask(value);
  return masked === '+7 ' ? '' : masked;
};

export function PhoneScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { requestOtp, isRequestingOtp } = useAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    <Screen
      footer={
        <Button
          disabled={!canSubmit}
          loading={isRequestingOtp}
          onPress={submit}
          title={t('auth.getCode')}
        />
      }
    >
      <StatusBar style="dark" />

      {/* Шапка: логотип + приветствие по центру */}
      <View style={styles.header}>
        <Image contentFit="contain" source={logoAsset} style={styles.logo} />
        <Text align="center" variant="title" style={{ marginTop: theme.spacing.md }}>
          {t('auth.phoneTitle')}
        </Text>
        <Text
          align="center"
          tone="muted"
          variant="caption"
          style={{ marginTop: theme.spacing.xxs }}
        >
          {t('auth.phoneSubtitle')}
        </Text>
      </View>

      {/* Плашка ввода телефона с золотой точкой слева */}
      <View style={styles.formArea}>
        <View style={styles.inputShell}>
          <View style={styles.dot} />
          <TextInput
            autoFocus
            keyboardType="phone-pad"
            onChangeText={(value) => {
              setPhone(normalizePhoneInput(value));
              setError(null);
            }}
            onSubmitEditing={canSubmit ? submit : undefined}
            placeholder={t('auth.phonePlaceholder')}
            placeholderTextColor={INPUT_PLACEHOLDER}
            returnKeyType="done"
            style={styles.input}
            textContentType="telephoneNumber"
            value={phone}
          />
        </View>

        {error ? (
          <Text
            align="center"
            tone="danger"
            variant="caption"
            style={{ marginTop: theme.spacing.sm }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 48,
  },
  logo: {
    height: 96,
    width: 96,
  },
  formArea: {
    paddingTop: 56,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderColor: INPUT_BORDER,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    height: 58,
    paddingHorizontal: 21,
    shadowColor: 'rgba(89,71,31,0.10)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  dot: {
    backgroundColor: DOT_COLOR,
    borderRadius: 999,
    height: 18,
    width: 18,
  },
  input: {
    color: INPUT_TEXT,
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
});
