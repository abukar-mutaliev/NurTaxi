/**
 * Диалог в стиле приложения — рисует очередь `showAlert`. Монтируется один раз в корне
 * приложения, поверх навигации.
 *
 * Раскладка кнопок: одна — во всю ширину; действие и отмена — в ряд; больше — столбцом,
 * основное действие сверху, отмена внизу. Основное — последнее не-отменяющее, как правая
 * кнопка системного диалога. «Назад» и тап мимо окна работают как отмена.
 */
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Text } from '../components/text';
import {
  currentAlert,
  dismissAlert,
  subscribeAlerts,
  type AlertButton,
  type AlertRequest,
} from './alert-store';

import { brandColors } from '../theme/brand';
/** Кремовая карточка, как листы заказа; в тёмной теме — поверхность темы. */
const LIGHT_CARD = brandColors.surface;
const LIGHT_CARD_BORDER = brandColors.divider;
const CARD_MAX_WIDTH = 360;
const BUTTON_HEIGHT = 50;

type ButtonTone = 'primary' | 'secondary' | 'destructive' | 'cancel';

function toneFor(button: AlertButton, isPreferred: boolean): ButtonTone {
  if (button.style === 'cancel') {
    return 'cancel';
  }
  if (button.style === 'destructive') {
    return 'destructive';
  }
  return isPreferred ? 'primary' : 'secondary';
}

export function AlertHost() {
  const alert = useSyncExternalStore(subscribeAlerts, currentAlert, currentAlert);

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={() => alert && closeWithoutButton(alert)}
      statusBarTranslucent
      transparent
      visible={alert != null}
    >
      {alert ? <AlertCard alert={alert} /> : null}
    </Modal>
  );
}

function press(alert: AlertRequest, button: AlertButton | undefined): void {
  dismissAlert(alert.id);
  button?.onPress?.();
}

/** Закрыли не кнопкой: отмена, если она есть; иначе единственная кнопка; иначе `onDismiss`. */
function closeWithoutButton(alert: AlertRequest): void {
  const cancel = alert.buttons.find((button) => button.style === 'cancel');
  if (cancel) {
    press(alert, cancel);
    return;
  }
  if (alert.buttons.length <= 1) {
    press(alert, alert.buttons[0]);
    return;
  }
  if (alert.options.cancelable) {
    dismissAlert(alert.id);
    alert.options.onDismiss?.();
  }
}

function AlertCard({ alert }: { alert: AlertRequest }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isLight = theme.scheme === 'light';

  const buttons = alert.buttons.length > 0 ? alert.buttons : [{ text: t('common.ok') }];
  const cancel = buttons.find((button) => button.style === 'cancel');
  const actions = buttons.filter((button) => button.style !== 'cancel');
  const inRow = buttons.length === 2 && cancel != null;
  // Основное действие — последнее, как правая кнопка системного диалога; в столбце оно сверху.
  const ordered = inRow
    ? [cancel, ...actions]
    : [...[...actions].reverse(), ...(cancel ? [cancel] : [])];
  const preferred = actions[actions.length - 1];

  const palette: Record<ButtonTone, { background: string; text: string }> = {
    cancel: {
      background: inRow ? theme.colors.surfaceMuted : 'transparent',
      text: theme.colors.textMuted,
    },
    destructive: { background: theme.colors.dangerSurface, text: theme.colors.danger },
    primary: { background: theme.colors.primary, text: theme.colors.onPrimary },
    secondary: { background: theme.colors.surfaceMuted, text: theme.colors.text },
  };

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel={cancel?.text ?? t('common.close')}
        onPress={() => closeWithoutButton(alert)}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]}
      />
      <View
        accessibilityRole="alert"
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            backgroundColor: isLight ? LIGHT_CARD : theme.colors.surface,
            borderColor: isLight ? LIGHT_CARD_BORDER : theme.colors.border,
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
            width: Math.min(CARD_MAX_WIDTH, width - theme.spacing.xl * 2),
          },
        ]}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Text accessibilityRole="header" align="center" variant="subtitle">
            {alert.title}
          </Text>
          {alert.message ? (
            <Text align="center" tone="muted" variant="caption">
              {alert.message}
            </Text>
          ) : null}
        </View>

        <View style={[inRow ? styles.row : styles.column, { gap: theme.spacing.sm }]}>
          {ordered.map((button) => {
            if (!button) {
              return null;
            }
            const tone = toneFor(button, button === preferred || buttons.length === 1);
            const colors = palette[tone];
            return (
              <Pressable
                accessibilityRole="button"
                key={`${button.text}:${button.style ?? 'default'}`}
                onPress={() => press(alert, button)}
                style={({ pressed }) => [
                  styles.button,
                  inRow && styles.buttonInRow,
                  { backgroundColor: colors.background, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>{button.text}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: BUTTON_HEIGHT / 2,
    justifyContent: 'center',
    minHeight: BUTTON_HEIGHT,
    paddingHorizontal: 16,
  },
  buttonInRow: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    elevation: 12,
    shadowColor: brandColors.shadowStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  column: {
    flexDirection: 'column',
  },
  root: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
