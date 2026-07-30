/** Экран ввода телефона → `POST /auth/otp/request` (M1.2, Figma node 39:1104). */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@nurtaxi/shared-core/features/auth';
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { applyPhoneMask, isValidPhone } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';

import { WelcomeGradientBackground } from '../../welcome-screen/ui/welcome-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const phoneColors = {
  background: '#F8F4EF',
  title: '#2E2331',
  subtitle: '#7A6E78',
  inputText: '#2E2331',
  inputPlaceholder: '#A99FA6',
  inputBg: 'rgba(255,255,255,0.72)',
  inputBorder: 'rgba(255,255,255,0.9)',
  iconOuter: 'rgba(252,244,228,0.95)',
  iconAccent: '#E8C882',
  buttonStart: '#5A2E60',
  buttonEnd: '#3A1D3F',
  buttonText: '#F7F3EE',
  inputShadow: 'rgba(89,71,31,0.06)',
  buttonShadow: 'rgba(89,71,31,0.1)',
  error: '#B42318',
} as const;

const logoAsset = require('@/assets/images/welcome/logo.png');
const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');
const markGlowAsset = require('@/assets/images/welcome/mark-glow.png');
const iconGlowAsset = require('@/assets/images/welcome/icon-glow.png');

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

  const logoWidth = sx(164);
  const logoHeight = sx(199);
  const logoLeft = (width - logoWidth) / 2;
  const logoTop = Math.max(insets.top, sy(20)) + sy(76);
  const logoRenderHeight = logoHeight * 1.0017;
  const logoRenderWidth = logoWidth * 1.3507;
  const logoCropOffsetX = logoWidth * 0.3507;
  const glowSize = sx(150);
  const glowLeft = (width - glowSize) / 2;

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

      <View
        pointerEvents="none"
        style={[
          styles.header,
          {
            paddingTop: logoTop + logoHeight + sy(24),
          },
        ]}
      >
        <Text style={[styles.title, { fontSize: sx(22), lineHeight: sx(28) }]}>
          {t('auth.phoneTitle')}
        </Text>
        <Text style={[styles.subtitle, { fontSize: sx(14), lineHeight: sx(20), marginTop: sy(2) }]}>
          {t('auth.phoneSubtitle')}
        </Text>
      </View>

      <View
        style={[
          styles.form,
          {
            paddingHorizontal: sx(40),
            top: sy(364),
          },
        ]}
      >
        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: phoneColors.inputBg,
              borderColor: phoneColors.inputBorder,
              borderRadius: sx(18),
              gap: sx(14),
              height: sx(58),
              paddingHorizontal: sx(21),
              shadowColor: phoneColors.inputShadow,
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
              autoFocus
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setPhone(normalizePhoneInput(value));
                setError(null);
              }}
              onSubmitEditing={canSubmit ? submit : undefined}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor={phoneColors.inputPlaceholder}
              returnKeyType="done"
              style={[
                styles.input,
                {
                  color: phoneColors.inputText,
                  fontSize: sx(16),
                },
              ]}
              textContentType="telephoneNumber"
              value={phone}
            />
          </View>
        </View>

        {error ? (
          <Text
            style={[
              styles.error,
              {
                fontSize: sx(13),
                marginTop: sy(8),
              },
            ]}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={submit}
          style={({ pressed }) => [
            styles.buttonWrap,
            {
              marginTop: sy(error ? 24 : 112),
              opacity: !canSubmit ? 0.45 : pressed ? 0.92 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[phoneColors.buttonStart, phoneColors.buttonEnd]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={[
              styles.button,
              {
                borderRadius: sx(29),
                height: sx(58),
                shadowColor: phoneColors.buttonShadow,
              },
            ]}
          >
            <Text style={[styles.buttonText, { fontSize: sx(16) }]}>
              {isRequestingOtp ? t('common.loading') : t('auth.getCode')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
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
    fontWeight: '500',
    padding: 0,
  },
  inputIconOuter: {
    alignItems: 'center',
    backgroundColor: phoneColors.iconOuter,
    borderRadius: 999,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
