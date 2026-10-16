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

function animationDuration(event: KeyboardEvent): number {
  // На Android события приходят после анимации клавиатуры и без длительности.
  return Platform.OS === 'ios' ? event.duration || 250 : 180;
}

/** Верх клавиатуры в координатах окна. */
function keyboardTop(event: KeyboardEvent): number {
  const { height, screenY } = event.endCoordinates;
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

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      void (async () => {
        // `measureInWindow` видит уже применённый сдвиг — возвращаемся к положению в покое.
        const applied = lift.value;
        const anchorBox = await measureBox(anchor);
        const ceilingBox = ceilingRef.current ? await measureBox(ceilingRef.current) : anchorBox;

        const needed = anchorBox.bottom + applied + gap - keyboardTop(event);
        const allowed = ceilingBox.top + applied - safeTop - gap;
        const next = Math.max(0, Math.min(needed, allowed));

        lift.value = withTiming(next, { duration: animationDuration(event) });
      })();
    });

    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      lift.value = withTiming(0, { duration: animationDuration(event) });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [gap, lift, safeTop]);

  const liftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value }] }));

  return { anchorRef, ceilingRef, liftStyle };
}
