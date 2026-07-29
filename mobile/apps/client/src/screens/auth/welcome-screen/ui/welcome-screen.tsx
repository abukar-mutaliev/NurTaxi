/** Экран приветствия — первый экран для гостя (Des §9, Figma node 2:2). */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { WelcomeGradientBackground } from './welcome-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const welcomeColors = {
  gradientBottom: '#F8F4EF',
  buttonStart: '#5A2E60',
  buttonEnd: '#3A1D3F',
  buttonBorder: 'rgba(255,255,255,0.9)',
  buttonText: '#F7F3EE',
  link: '#7A6E78',
  linkAction: '#2E2331',
  shadow: 'rgba(89,71,31,0.06)',
} as const;

const logoAsset = require('@/assets/images/welcome/logo.png');
const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');
const ellipseBottomAsset = require('@/assets/images/welcome/ellipse-bottom.png');
const markGlowAsset = require('@/assets/images/welcome/mark-glow.png');
const iconGlowAsset = require('@/assets/images/welcome/icon-glow.png');

export function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  /** Вертикаль тянем к высоте экрана, чтобы футер и логотип держали пропорции макета. */
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  const logoWidth = sx(164);
  const logoHeight = sx(199);
  const logoLeft = (width - logoWidth) / 2;
  const logoTop = sy(242);
  /**
   * В ассете знак смещён вправо (~63% ширины). Figma обрезает слева на 35.07%,
   * чтобы марка оказалась по центру контейнера 164×199.
   */
  const logoRenderHeight = logoHeight * 1.0017;
  const logoRenderWidth = logoWidth * 1.3507;
  const logoCropOffsetX = logoWidth * 0.3507;

  const glowSize = sx(150);
  const glowLeft = (width - glowSize) / 2;

  const goToLogin = () => {
    router.push('/(auth)/phone');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <WelcomeGradientBackground />

      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseTopAsset}
        style={[
          styles.layer,
          {
            height: sx(460),
            left: sx(-35),
            top: sy(100),
            width: sx(460),
          },
        ]}
      />
      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseBottomAsset}
        style={[
          styles.layer,
          {
            height: sy(300),
            left: sx(-185),
            top: sy(560),
            width: sx(760),
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
            top: sy(120),
            width: glowSize,
          },
        ]}
      />

      <View
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
            top: sy(188),
            width: glowSize,
          },
        ]}
      />

      <View
        style={[
          styles.footer,
          {
            bottom: Math.max(insets.bottom, sy(34)) + sy(66),
            gap: sx(24),
            paddingHorizontal: sx(40),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={goToLogin}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: pressed ? welcomeColors.buttonEnd : welcomeColors.buttonStart,
              borderColor: welcomeColors.buttonBorder,
              height: sx(60),
              opacity: pressed ? 0.92 : 1,
              shadowColor: welcomeColors.shadow,
            },
          ]}
        >
          <Text style={styles.primaryButtonText} variant="bodyStrong">
            {t('welcome.start')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={goToLogin}
          style={styles.loginLink}
        >
          <Text align="center" style={styles.loginPrompt} variant="caption">
            {t('welcome.hasAccount')}{' '}
            <Text style={styles.loginAction} variant="caption">
              {t('welcome.signIn')}
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  layer: {
    position: 'absolute',
  },
  loginAction: {
    color: welcomeColors.linkAction,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginPrompt: {
    color: welcomeColors.link,
    fontSize: 14,
    fontWeight: '500',
  },
  logoClip: {
    overflow: 'hidden',
    position: 'absolute',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  primaryButtonText: {
    color: welcomeColors.buttonText,
    fontSize: 17,
    fontWeight: '600',
  },
  root: {
    backgroundColor: welcomeColors.gradientBottom,
    flex: 1,
  },
});
