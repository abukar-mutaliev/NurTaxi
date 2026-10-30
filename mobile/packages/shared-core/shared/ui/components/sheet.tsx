import { useEffect, useState, type ReactNode } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/theme-provider';
import { Text } from './text';
import { radius } from '../theme/tokens';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Запрещает закрытие тапом по фону — для необратимых подтверждений (например, SOS). */
  dismissable?: boolean;
}

/**
 * Экранная координата верха клавиатуры.
 * Если окно потом само ужимается (`adjustResize`), актуальная высота окна
 * совпадёт с этой точкой и дополнительный сдвиг станет нулевым.
 * В edge-to-edge окно не ужимается — панель поднимаем на эту разницу сами.
 */
function keyboardTop(event: KeyboardEvent): number {
  const windowHeight = Dimensions.get('window').height;
  const { height, screenY } = event.endCoordinates;

  if (screenY > 0 && screenY < windowHeight) {
    return screenY;
  }

  return Math.max(0, windowHeight - Math.max(height, 0));
}

/**
 * Нижняя модальная панель. Основной способ показать выбор тарифа, подтверждение отмены,
 * детали заказа поверх карты.
 */
export function Sheet({ visible, onClose, title, children, dismissable = true }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardTopY, setKeyboardTopY] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardTopY(keyboardTop(event));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardTopY(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      // Сброс в cleanup (а не в теле эффекта): при закрытии панели не остаётся устаревшего отступа.
      setKeyboardTopY(null);
    };
  }, [visible]);

  const requestClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const keyboardInset = keyboardTopY == null ? 0 : Math.max(0, windowHeight - keyboardTopY);
  const topGap = Math.max(insets.top, 12) + theme.spacing.sm;
  const bottomPadding = keyboardInset > 0 ? theme.spacing.md : insets.bottom + theme.spacing.lg;

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={requestClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Закрыть"
          disabled={!dismissable}
          onPress={dismissable ? requestClose : undefined}
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              bottom: keyboardInset,
              gap: theme.spacing.md,
              maxHeight: Math.max(220, windowHeight - keyboardInset - topGap),
              paddingBottom: bottomPadding,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          {title ? <Text variant="subtitle">{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 4,
    width: 40,
  },
  panel: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  root: {
    flex: 1,
  },
});
