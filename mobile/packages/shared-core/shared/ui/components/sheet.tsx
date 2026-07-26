import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/theme-provider';
import { Text } from './text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Запрещает закрытие тапом по фону — для необратимых подтверждений (например, SOS). */
  dismissable?: boolean;
}

/**
 * Нижняя модальная панель. Основной способ показать выбор тарифа, подтверждение отмены,
 * детали заказа поверх карты.
 */
export function Sheet({ visible, onClose, title, children, dismissable = true }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        accessibilityLabel="Закрыть"
        disabled={!dismissable}
        onPress={dismissable ? onClose : undefined}
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      />
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            gap: theme.spacing.md,
            paddingBottom: insets.bottom + theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
        {title ? <Text variant="subtitle">{title}</Text> : null}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: 999,
    height: 4,
    width: 40,
  },
  panel: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
