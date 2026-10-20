/**
 * Подъём контента над клавиатурой.
 *
 * Android собирается edge-to-edge, и `windowSoftInputMode=adjustResize` больше не ужимает
 * окно — клавиатура ложится поверх экрана. `KeyboardAvoidingView` тут не помогает: экраны
 * входа и лист заказа свёрстаны абсолютным позиционированием, и отступ снизу их не двигает.
 *
 * Хук сдвигает контейнер (`liftStyle`) вверх ровно настолько, чтобы нижний край `anchorRef`
 * (форма с кнопкой, лист заказа) оказался над клавиатурой. Подъём ограничен сверху: верх
 * `ceilingRef` — а без него верх самого якоря — не уходит под статус-бар. Если всё не
 * помещается, важнее видеть заголовок и поле, чем кнопку.
 *
 * На якорь и потолок нужен `collapsable={false}`: Android выкидывает «пустые» View из
 * нативной иерархии, и `measureInWindow` по ним ничего не вернёт.
 */
import { useEffect, useRef } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent, type View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Зазор между якорем и клавиатурой, а также между потолком и статус-баром. */
const DEFAULT_GAP = 16;
/** Длительность подъёма, когда клавиатура уже открыта: события с длительностью нет. */
const ANDROID_LIFT_MS = 180;
/** Подождать раскладку нового экрана, прежде чем мерить якорь. */
const INITIAL_MEASURE_DELAY_MS = 120;

function animationDuration(event: KeyboardEvent): number {
  // На Android события приходят после анимации клавиатуры и без длительности.
  return Platform.OS === 'ios' ? event.duration || 250 : ANDROID_LIFT_MS;
}

/** Верх клавиатуры в координатах окна. */
function keyboardTop({ height, screenY }: { height: number; screenY: number }): number {
  return screenY > 0 ? screenY : Dimensions.get('window').height - height;
}

function measureBox(view: View): Promise<{ top: number; bottom: number }> {
  return new Promise((resolve) => {
    view.measureInWindow((_x, y, _width, height) => resolve({ top: y, bottom: y + height }));
  });
}

export interface KeyboardLiftOptions {
  gap?: number;
}

export function useKeyboardLift({ gap = DEFAULT_GAP }: KeyboardLiftOptions = {}) {
  const { top: safeTop } = useSafeAreaInsets();
  const anchorRef = useRef<View>(null);
  const ceilingRef = useRef<View>(null);
  const lift = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const liftAbove = (keyboardTopY: number, duration: number) => {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      void (async () => {
        // `measureInWindow` видит уже применённый сдвиг — возвращаемся к положению в покое.
        const applied = lift.value;
        const anchorBox = await measureBox(anchor);
        const ceilingBox = ceilingRef.current ? await measureBox(ceilingRef.current) : anchorBox;

        const needed = anchorBox.bottom + applied + gap - keyboardTopY;
        const allowed = ceilingBox.top + applied - safeTop - gap;
        const next = Math.max(0, Math.min(needed, allowed));

        lift.value = withTiming(next, { duration });
      })();
    };

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      liftAbove(keyboardTop(event.endCoordinates), animationDuration(event));
    });

    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      lift.value = withTiming(0, { duration: animationDuration(event) });
    });

    /**
     * Клавиатура могла остаться открытой с прошлого экрана (номер → код): фокус переходит
     * в новое поле, и события показа уже не будет. Без этой проверки поле кода оставалось
     * под клавиатурой, пока её не закрыть и не открыть снова.
     */
    const metrics = Keyboard.isVisible() ? Keyboard.metrics() : undefined;
    const initialLift = metrics
      ? setTimeout(() => liftAbove(keyboardTop(metrics), ANDROID_LIFT_MS), INITIAL_MEASURE_DELAY_MS)
      : null;

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (initialLift) {
        clearTimeout(initialLift);
      }
    };
  }, [gap, lift, safeTop]);

  const liftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value }] }));

  return { anchorRef, ceilingRef, liftStyle };
}
