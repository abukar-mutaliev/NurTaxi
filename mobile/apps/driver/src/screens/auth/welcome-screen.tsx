/**
 * Экран приветствия водителя (M1.1) — первый экран для гостя.
 * Логотип «Нур» на тёплом золотом градиенте, кнопка «Начать» и вход для существующего аккаунта.
 */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { PillButton } from '@/shared/ui/pill-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const c = {
  link: '#7A6E78',
  linkAction: '#2E2331',
} as const;

const logoAsset = require('@/assets/images/welcome/logo.png');

const LOGO_DESIGN_WIDTH = 164;
const LOGO_DESIGN_HEIGHT = 199;

export function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const goToLogin = () => router.push('/(auth)/phone');

  const logoHeight = sy(300);
  const logoWidth = (LOGO_DESIGN_WIDTH / LOGO_DESIGN_HEIGHT) * logoHeight;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGradientBackground tone="gold" />

      <View
        style={{
          flex: 1,
          paddingBottom: Math.max(insets.bottom, sy(24)) + sy(40),
          paddingHorizontal: sx(40),
          paddingTop: Math.max(insets.top, sy(32)),
        }}
      >
        <View style={styles.logoArea}>
          {/*
            Ассет обрезан по краям знака, поэтому `contain` вписывает логотип целиком.
            Ручной сдвиг слева срезал «ЖЕ» из «ЖЕНСКОЕ ТАКСИ».
          */}
          <Image
            accessibilityLabel={t('auth.brandName')}
            contentFit="contain"
            source={logoAsset}
            style={{ height: logoHeight, width: logoWidth }}
          />
        </View>

        <PillButton height={sx(58)} onPress={goToLogin} title={t('welcome.start')} />

        <Pressable hitSlop={8} onPress={goToLogin} style={{ marginTop: sy(18) }}>
          <Text style={[styles.link, { fontSize: sx(14) }]}>
            {t('welcome.hasAccount')}{' '}
            <Text style={[styles.linkAction, { fontSize: sx(14) }]}>{t('welcome.signIn')}</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    color: c.link,
    fontWeight: '500',
    textAlign: 'center',
  },
  linkAction: {
    color: c.linkAction,
    fontWeight: '600',
  },
  logoArea: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
});
