/**
 * Нижняя шторка с двумя положениями: целиком и свёрнутая до ручки.
 * Жест по ручке меняет высоту, чтобы карта под окном заказа оставалась доступной.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { glassShadow } from './glass-shadow';

const SNAP_MS = 240;

export interface CollapsibleSheetProps {
  children: ReactNode;
  onVisibleHeightChange?: (height: number) => void;
  style?: StyleProp<ViewStyle>;
  /** `inline` — ручка внутри карточки. `floating` — отдельная плашка над содержимым. */
  variant?: 'inline' | 'floating';
}

export function CollapsibleSheet({
  children,
  onVisibleHeightChange,
  style,
  variant = 'inline',
}: CollapsibleSheetProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const contentHeight = useSharedValue(0);
  const collapsedHeight = useSharedValue(0);
  const visible = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const expandedFlag = useSharedValue(1);

  const publish = useCallback(
    (height: number, isExpanded: boolean) => {
      setExpanded((current) => (current === isExpanded ? current : isExpanded));
      onVisibleHeightChange?.(height);
    },
    [onVisibleHeightChange],
  );

  const onContentLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (next <= 0 || Math.abs(contentHeight.value - next) < 1) {
      return;
    }

    const first = contentHeight.value === 0;
    contentHeight.value = next;
    if (first || expandedFlag.value === 1) {
      visible.value = next;
      publish(next, true);
    }
  };

  const onPeekLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (next <= 0 || Math.abs(collapsedHeight.value - next) < 1) {
      return;
    }

    collapsedHeight.value = next;
    if (expandedFlag.value === 0) {
      visible.value = next;
      publish(next, false);
    }
  };

  const gesture = useMemo(() => {
    const timing = { duration: SNAP_MS, easing: Easing.out(Easing.cubic) };

    const snap = (expandedNext: boolean) => {
      'worklet';
      const min = Math.max(collapsedHeight.value, 1);
      const max = Math.max(contentHeight.value, min);
      const target = expandedNext ? max : min;
      expandedFlag.value = expandedNext ? 1 : 0;
      visible.value = withTiming(target, timing, (finished) => {
        if (finished) {
          runOnJS(publish)(target, expandedNext);
        }
      });
    };

    const pan = Gesture.Pan()
      .activeOffsetY([-8, 8])
      .onStart(() => {
        dragStart.value = visible.value;
      })
      .onUpdate((event) => {
        const min = Math.max(collapsedHeight.value, 1);
        const max = Math.max(contentHeight.value, min);
        const next = dragStart.value - event.translationY;
        visible.value = Math.min(max, Math.max(min, next));
      })
      .onEnd((event) => {
        const min = Math.max(collapsedHeight.value, 1);
        const max = Math.max(contentHeight.value, min);
        const projected = visible.value - event.velocityY * 0.12;
        snap(projected > (min + max) / 2);
      });

    const tap = Gesture.Tap().onEnd(() => {
      snap(expandedFlag.value !== 1);
    });

    return Gesture.Exclusive(pan, tap);
    // Shared values стабильны на всё время жизни компонента. В deps их нельзя:
    // react-hooks/immutability считает зависимость хука неизменяемой и запрещает
    // штатную запись `.value`, хотя для Reanimated это обычный API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish]);

  const frameStyle = useAnimatedStyle(() => {
    if (visible.value <= 0) {
      return { overflow: 'hidden' as const };
    }

    return {
      height: visible.value,
      overflow: 'hidden' as const,
    };
  });

  const floating = variant === 'floating';

  return (
    <Animated.View style={[styles.clip, style, frameStyle]}>
      <View onLayout={onContentLayout} style={styles.content}>
        <GestureDetector gesture={gesture}>
          <View
            accessibilityLabel={expanded ? t('order.collapseSheet') : t('order.expandSheet')}
            accessibilityRole="button"
            accessible
            onLayout={onPeekLayout}
            style={floating ? styles.floatingPeek : styles.inlinePeek}
          >
            <View style={floating ? styles.floatingHandle : styles.inlineHandle}>
              <View style={styles.grabber} />
            </View>
          </View>
        </GestureDetector>

        <View pointerEvents={expanded ? 'auto' : 'none'}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  content: {
    flexShrink: 0,
  },
  floatingHandle: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    ...glassShadow({ color: 'rgba(89,71,31,0.12)', offset: { width: 0, height: 4 }, radius: 8 }),
  },
  floatingPeek: {
    paddingBottom: 8,
  },
  grabber: {
    backgroundColor: '#D9D0C4',
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  inlineHandle: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
  },
  inlinePeek: {
    alignItems: 'center',
    paddingBottom: 4,
    paddingTop: 8,
  },
});
