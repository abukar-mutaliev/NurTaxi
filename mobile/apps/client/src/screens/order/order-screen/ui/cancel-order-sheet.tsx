/**
 * Подтверждение отмены заказа клиентом.
 *
 * Раньше здесь стояли общие поле и красно-оранжевая кнопка дизайн-системы — чужие для
 * экрана поездки. Теперь кнопки те же, что на карточке водителя: мягкая красная «Отменить»
 * с крестиком и нейтральная «Не отменять» — передумать так же просто, как и подтвердить.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  brandColors,
  fontFamily,
  radius,
  Sheet,
  Text,
  typeScale,
} from '@nurtaxi/shared-core/shared/ui';

const colors = {
  text: brandColors.text,
  label: brandColors.textMuted,
  placeholder: brandColors.textMuted,
  fieldBg: brandColors.background,
  fieldBorder: brandColors.divider,
  keepBg: brandColors.secondarySoft,
  cancelBg: brandColors.dangerSoft,
  cancelText: brandColors.danger,
} as const;

const CANCEL_ICON: SymbolViewProps['name'] = { android: 'close', ios: 'xmark', web: 'close' };

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
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{reasonLabel}</Text>
          <TextInput
            accessibilityLabel={reasonLabel}
            maxLength={500}
            multiline
            onChangeText={onReasonChange}
            placeholder={reasonPlaceholder}
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            value={reason}
          />
        </View>

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
            <Text style={styles.keepText}>{keepLabel}</Text>
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
              <ActivityIndicator color={colors.cancelText} />
            ) : (
              <>
                <SymbolView
                  name={CANCEL_ICON}
                  resizeMode="scaleAspectFit"
                  size={18}
                  tintColor={colors.cancelText}
                  type="monochrome"
                  weight={{ android: medium, ios: 'medium' }}
                />
                <Text style={styles.cancelText}>{confirmLabel}</Text>
              </>
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
    gap: 14,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: colors.cancelBg,
  },
  cancelText: {
    color: colors.cancelText,
    fontSize: typeScale.base,
    fontWeight: '600',
  },
  fee: {
    color: colors.cancelText,
    fontSize: typeScale.sm,
    fontWeight: '500',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.label,
    fontSize: typeScale.xs,
    fontWeight: '500',
  },
  input: {
    fontFamily: fontFamily.regular,
    backgroundColor: colors.fieldBg,
    borderColor: colors.fieldBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    fontSize: typeScale.base,
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  keepButton: {
    backgroundColor: colors.keepBg,
  },
  keepText: {
    color: colors.text,
    fontSize: typeScale.base,
    fontWeight: '600',
  },
});
