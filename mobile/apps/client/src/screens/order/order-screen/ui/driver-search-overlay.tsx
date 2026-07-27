import { useEffect } from 'react';
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

import { Text } from '@nurtaxi/shared-core/shared/ui';

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
  const { width } = useWindowDimensions();
  const scale = width / 390;

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
      <View pointerEvents="none" style={[styles.overlay, { backgroundColor: colors.overlay }]} />

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      </View>

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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    width: 44,
  },
  backIcon: {
    color: colors.title,
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
    marginTop: -2,
    textAlign: 'center',
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
    shadowColor: 'rgba(247,220,168,0.45)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    zIndex: 2,
  },
  footer: {
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
