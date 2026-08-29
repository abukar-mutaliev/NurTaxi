import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS, GLASS_DESIGN_WIDTH, GlassCard, GlassPrimaryButton } from '@/shared/ui';
import { WelcomeGradientBackground } from '@/shared/ui/welcome-gradient-background';

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');
const logoAsset = require('@/assets/images/welcome/logo.png');

export interface ErrorBoundaryFallbackProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorBoundaryFallback({ error, onRetry }: ErrorBoundaryFallbackProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const logoWidth = scale * 72;
  const logoHeight = scale * 56;
  const logoRenderWidth = logoWidth * 1.3507;
  const logoCropOffsetX = logoWidth * 0.3507;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeGradientBackground />
      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseTopAsset}
        style={[
          styles.ellipse,
          {
            height: scale * 560,
            left: scale * -90,
            top: scale * -200,
            width: scale * 560,
          },
        ]}
      />

      <View
        style={[
          styles.content,
          {
            gap: scale * 16,
            paddingBottom: insets.bottom + scale * 24,
            paddingHorizontal: scale * 16,
            paddingTop: insets.top + scale * 48,
          },
        ]}
      >
        <View style={[styles.hero, { gap: scale * 20 }]}>
          <View style={[styles.logoClip, { height: logoHeight, width: logoWidth }]}>
            <Image
              contentFit="fill"
              source={logoAsset}
              style={{
                height: logoHeight * 1.0017,
                marginLeft: -logoCropOffsetX,
                width: logoRenderWidth,
              }}
            />
          </View>

          <View style={[styles.copy, { gap: scale * 8 }]}>
            <Text
              style={[
                styles.title,
                {
                  fontSize: scale * 24,
                  lineHeight: scale * 30,
                },
              ]}
            >
              Что-то пошло не так
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: scale * 15,
                  lineHeight: scale * 22,
                },
              ]}
            >
              Попробуйте вернуться на предыдущий экран или перезапустить экран. Если ошибка
              повторяется, перезапустите приложение.
            </Text>
          </View>
        </View>

        <GlassCard tone="warning" style={{ gap: scale * 10 }}>
          <Text style={[styles.cardTitle, { fontSize: scale * 14 }]}>Что можно сделать</Text>
          <Text style={[styles.cardText, { fontSize: scale * 13, lineHeight: scale * 18 }]}>
            Нажмите «Попробовать снова». Если ошибка повторяется, перезапустите приложение.
          </Text>
          {__DEV__ ? (
            <Text
              selectable
              style={[styles.devError, { fontSize: scale * 12, lineHeight: scale * 17 }]}
            >
              {error.message}
            </Text>
          ) : null}
        </GlassCard>

        <GlassPrimaryButton onPress={onRetry} scale={scale} title="Попробовать снова" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardText: {
    color: GLASS_COLORS.subtitle,
  },
  cardTitle: {
    color: GLASS_COLORS.title,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
  },
  devError: {
    color: GLASS_COLORS.error,
    fontFamily: 'monospace',
  },
  ellipse: {
    position: 'absolute',
  },
  hero: {
    alignItems: 'center',
  },
  logoClip: {
    overflow: 'hidden',
  },
  root: {
    backgroundColor: GLASS_COLORS.background,
    flex: 1,
  },
  subtitle: {
    color: GLASS_COLORS.subtitle,
    textAlign: 'center',
  },
  title: {
    color: GLASS_COLORS.title,
    fontWeight: '700',
    textAlign: 'center',
  },
});
