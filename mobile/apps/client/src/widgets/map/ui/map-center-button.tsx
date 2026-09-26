import { useEffect } from 'react';
import { Keyboard, Platform, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { GlassIconButton } from '@/shared/ui';

const FLOAT_GAP = 12;
const FLOAT_RIGHT = 16;
const ICON_COLOR = '#2E2331';

export interface MapCenterButtonProps {
  onPress: () => void;
  /** Отступ снизу без клавиатуры: таб-бар, нижняя карточка, safe area. */
  bottomInset: number;
  disabled?: boolean;
}

/**
 * Кнопка центрирования карты — справа снизу.
 * При открытии клавиатуры поднимается и остаётся над ней справа.
 */
export function MapCenterButton({ onPress, bottomInset, disabled = false }: MapCenterButtonProps) {
  const { t } = useTranslation();
  const keyboardHeight = useSharedValue(0);
  const restBottom = useSharedValue(bottomInset);
  const disabledOpacity = useSharedValue(disabled ? 0.45 : 1);

  useEffect(() => {
    restBottom.value = bottomInset;
  }, [bottomInset, restBottom]);

  useEffect(() => {
    disabledOpacity.value = disabled ? 0.45 : 1;
  }, [disabled, disabledOpacity]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      keyboardHeight.value = withTiming(event.endCoordinates.height, {
        duration: Platform.OS === 'ios' ? (event.duration ?? 250) : 180,
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      keyboardHeight.value = withTiming(0, {
        duration: Platform.OS === 'ios' && 'duration' in event ? (event.duration ?? 250) : 180,
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    bottom: Math.max(restBottom.value, keyboardHeight.value) + FLOAT_GAP,
    opacity: disabledOpacity.value,
    right: FLOAT_RIGHT,
  }));

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, animatedStyle]}>
      <GlassIconButton
        accessibilityLabel={t('addresses.myLocation')}
        onPress={disabled ? () => undefined : onPress}
      >
        <SymbolView
          name={{ android: 'my_location', ios: 'location.fill', web: 'my_location' }}
          resizeMode="scaleAspectFit"
          size={22}
          tintColor={ICON_COLOR}
          type="monochrome"
          weight={{ android: medium, ios: 'medium' }}
        />
      </GlassIconButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 5,
  },
});
