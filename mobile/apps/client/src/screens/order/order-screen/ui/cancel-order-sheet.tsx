/**
 * Подтверждение отмены заказа клиентом.
 *
 * Кнопки — спокойные заливки из палитры, подпись в одну строку: «Не отменять» рядом с
 * «Отменить заказ», передумать так же просто, как и подтвердить. Поле причины — общее `Input`:
 * приглушённая заливка, которая не спорит с окном вокруг.
 */
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { brandColors, Input, radius, Sheet, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

export interface CancelOrderSheetProps {
  visible: boolean;
  title: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reason: string;
  /** Предупреждение о штрафе, если отмена платная. */
  feeNotice?: string | null;
  confirmLabel: string;
  keepLabel: string;
  isCancelling: boolean;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelOrderSheet({
  visible,
  title,
  reasonLabel,
  reasonPlaceholder,
  reason,
  feeNotice,
  confirmLabel,
  keepLabel,
  isCancelling,
  onReasonChange,
  onConfirm,
  onClose,
}: CancelOrderSheetProps) {
  return (
    <Sheet onClose={onClose} title={title} visible={visible}>
      <View style={styles.body}>
        <Input
          label={reasonLabel}
          maxLength={500}
          multiline
          onChangeText={onReasonChange}
          placeholder={reasonPlaceholder}
          style={styles.reason}
          value={reason}
        />

        {feeNotice ? <Text style={styles.fee}>{feeNotice}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isCancelling}
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              styles.keepButton,
              { opacity: isCancelling ? 0.45 : pressed ? 0.88 : 1 },
            ]}
          >
            <Text numberOfLines={1} style={styles.keepText}>
              {keepLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isCancelling }}
            disabled={isCancelling}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              { opacity: pressed ? 0.88 : 1 },
            ]}
          >
            {isCancelling ? (
              <ActivityIndicator color={brandColors.danger} />
            ) : (
              <Text numberOfLines={1} style={styles.cancelText}>
                {confirmLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  body: {
    gap: 16,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelButton: {
    backgroundColor: brandColors.dangerSoft,
  },
  cancelText: {
    color: brandColors.danger,
    fontSize: typeScale.md,
    fontWeight: '600',
  },
  fee: {
    color: brandColors.danger,
    fontSize: typeScale.sm,
    fontWeight: '500',
  },
  keepButton: {
    backgroundColor: brandColors.surfaceMuted,
  },
  keepText: {
    color: brandColors.text,
    fontSize: typeScale.md,
    fontWeight: '600',
  },
  reason: {
    fontSize: typeScale.md,
    lineHeight: 20,
    minHeight: 76,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
});
