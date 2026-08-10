import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/theme-provider';

export interface ScreenProps {
  children: ReactNode;
  /** Оборачивает содержимое в ScrollView — для форм и длинных списков настроек. */
  scroll?: boolean;
  /** Отключает горизонтальные отступы: нужно для карт и полноэкранных виджетов. */
  edgeToEdge?: boolean;
  /** Учитывать нижний системный отступ (жесты/навбар). */
  safeBottom?: boolean;
  style?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}

/** Базовый контейнер экрана: фон темы, safe area, поведение клавиатуры. */
export function Screen({
  children,
  scroll = false,
  edgeToEdge = false,
  safeBottom = true,
  style,
  footer,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingHorizontal: edgeToEdge ? 0 : theme.spacing.lg,
    paddingBottom: safeBottom ? insets.bottom + theme.spacing.lg : 0,
  };

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.grow, padding, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.grow, padding, style]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      /**
       * `padding` нужен на обеих платформах. Android собирается в режиме edge-to-edge
       * (`edgeToEdgeEnabled=true`), а в нём `windowSoftInputMode=adjustResize` больше не
       * ужимает окно — клавиатура просто ложится поверх формы и прячет нижние поля.
       * Без явного behavior KeyboardAvoidingView на Android ничего не делает.
       */
      behavior="padding"
      style={[styles.grow, { backgroundColor: theme.colors.background }]}
    >
      {content}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
              paddingBottom: insets.bottom + theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grow: {
    flex: 1,
  },
});
