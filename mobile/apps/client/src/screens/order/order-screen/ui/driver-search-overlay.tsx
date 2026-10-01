import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { Chevron } from '@/shared/ui';
import { glassShadow } from '@/shared/ui/glass-shadow';

import { useOrderTopInset } from './use-order-top-inset';

const colors = {
  overlay: 'rgba(248,244,239,0.72)',
  glassBg: 'rgba(255,255,255,0.8)',
  glassBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  title: '#2E2331',
  subtitle: '#7A6E78',
  ringOuter: 'rgba(247,220,168,0.35)',
  ringMid: 'rgba(247,220,168,0.5)',
  ringInner: 'rgba(252,239,214,0.75)',
  core: '#FCEFD6',
  coreBorder: 'rgba(247,220,168,0.9)',
  car: 'rgba(58,29,63,0.6)',
} as const;

const RING_COUNT = 3;
const PULSE_DURATION_MS = 2800;

function PulseRing({ index, baseSize }: { index: number; baseSize: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * (PULSE_DURATION_MS / RING_COUNT),
      withRepeat(
        withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.72, 1.18]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        animatedStyle,
        {
          backgroundColor: colors.ringOuter,
          borderColor: colors.coreBorder,
          height: baseSize,
          width: baseSize,
        },
      ]}
    />
  );
}

export interface DriverSearchOverlayProps {
  titleLine1: string;
  titleLine2: string;
  subtitleLine1: string;
  subtitleLine2: string;
  cancelLabel: string;
  onBack: () => void;
  onCancel: () => void;
}

export function DriverSearchOverlay({
  titleLine1,
  titleLine2,
  subtitleLine1,
  subtitleLine2,
  cancelLabel,
  onBack,
  onCancel,
}: DriverSearchOverlayProps) {
  const insets = useSafeAreaInsets();
  const headerTopInset = useOrderTopInset();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const [minimized, setMinimized] = useState(false);

  const coreBreath = useSharedValue(0);

  useEffect(() => {
    coreBreath.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [coreBreath]);

  const coreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(coreBreath.value, [0, 1], [1, 1.04]) }],
  }));

  const carAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(coreBreath.value, [0, 0.5, 1], [0.85, 1, 0.85]),
    transform: [{ scaleX: interpolate(coreBreath.value, [0, 1], [1, 1.08]) }],
  }));

  const radarSize = scale * 300;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {minimized ? null : (
        <View pointerEvents="none" style={[styles.overlay, { backgroundColor: colors.overlay }]} />
      )}

      <View style={[styles.topBar, { paddingTop: headerTopInset }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Chevron color={colors.title} />
        </Pressable>
      </View>

      {minimized ? null : (
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { fontSize: scale * 22, lineHeight: scale * 28 }]}>
              {titleLine1}
            </Text>
            <Text style={[styles.title, { fontSize: scale * 22, lineHeight: scale * 28 }]}>
              {titleLine2}
            </Text>
          </View>

          <View style={[styles.radar, { height: radarSize, width: radarSize }]}>
            <View
              pointerEvents="none"
              style={[
                styles.staticRing,
                {
                  backgroundColor: colors.ringMid,
                  height: radarSize * 0.76,
                  width: radarSize * 0.76,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.staticRing,
                {
                  backgroundColor: colors.ringInner,
                  height: radarSize * 0.52,
                  width: radarSize * 0.52,
                },
              ]}
            />

            {Array.from({ length: RING_COUNT }, (_, index) => (
              <PulseRing baseSize={radarSize} index={index} key={index} />
            ))}

            <Animated.View
              style={[
                styles.core,
                coreAnimatedStyle,
                {
                  height: radarSize * 0.347,
                  width: radarSize * 0.347,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.carIcon,
                  carAnimatedStyle,
                  {
                    height: radarSize * 0.067,
                    width: radarSize * 0.147,
                  },
                ]}
              />
            </Animated.View>
          </View>

          <View style={styles.subtitleBlock}>
            <Text style={[styles.subtitle, { fontSize: scale * 14, lineHeight: scale * 20 }]}>
              {subtitleLine1}
            </Text>
            <Text style={[styles.subtitle, { fontSize: scale * 14, lineHeight: scale * 20 }]}>
              {subtitleLine2}
            </Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.footer,
          minimized ? styles.footerMinimized : null,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
      >
        <View style={minimized ? styles.minimizedCard : styles.expandedFooter}>
          <Pressable
            accessibilityLabel={minimized ? t('order.expandSheet') : t('order.collapseSheet')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setMinimized((value) => !value)}
            style={styles.handle}
          >
            <View style={styles.grabber} />
          </Pressable>

          {minimized ? (
            <View style={styles.minimizedCopy}>
              <Text style={styles.minimizedTitle}>
                {titleLine1} {titleLine2}
              </Text>
              <Text style={styles.minimizedSubtitle}>
                {subtitleLine1} {subtitleLine2}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    height: 44,
    justifyContent: 'center',
    ...glassShadow({ color: colors.shadow }),
    width: 44,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderRadius: 25,
    borderWidth: 1,
    elevation: 2,
    height: 50,
    justifyContent: 'center',
    minWidth: 180,
    paddingHorizontal: 24,
    ...glassShadow({ color: colors.shadow }),
  },
  cancelText: {
    color: colors.subtitle,
    fontSize: 15,
    fontWeight: '500',
  },
  carIcon: {
    backgroundColor: colors.car,
    borderRadius: 7,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  core: {
    alignItems: 'center',
    backgroundColor: colors.core,
    borderColor: colors.coreBorder,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 3,
    justifyContent: 'center',
    ...glassShadow({ color: 'rgba(247,220,168,0.45)', radius: 16 }),
    zIndex: 2,
  },
  footer: {
    alignItems: 'center',
  },
  footerMinimized: {
    bottom: 0,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  grabber: {
    backgroundColor: '#D9D0C4',
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  handle: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    height: 28,
    justifyContent: 'center',
    marginBottom: 8,
    width: 72,
    ...glassShadow({ color: colors.shadow, offset: { width: 0, height: 4 }, radius: 8 }),
  },
  minimizedCard: {
    alignItems: 'center',
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderRadius: 28,
    borderWidth: 1,
    gap: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    width: '100%',
    ...glassShadow({ color: colors.shadow }),
  },
  minimizedCopy: {
    alignItems: 'center',
    gap: 4,
  },
  minimizedSubtitle: {
    color: colors.subtitle,
    fontSize: 13,
    textAlign: 'center',
  },
  minimizedTitle: {
    color: colors.title,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  expandedFooter: {
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  pressed: {
    opacity: 0.88,
  },
  pulseRing: {
    borderRadius: 999,
    borderWidth: 1,
    position: 'absolute',
  },
  radar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  staticRing: {
    borderRadius: 999,
    position: 'absolute',
  },
  subtitle: {
    color: colors.subtitle,
    fontWeight: '400',
    textAlign: 'center',
  },
  subtitleBlock: {
    alignItems: 'center',
    gap: 0,
  },
  title: {
    color: colors.title,
    fontWeight: '600',
    textAlign: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  topBar: {
    left: 22,
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
});
