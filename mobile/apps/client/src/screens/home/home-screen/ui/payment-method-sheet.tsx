import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import { Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS, GLASS_DESIGN_WIDTH, GlassCard } from '@/shared/ui';

import { PaymentMethodIcon } from './payment-method-icon';

const PAYMENT_METHODS = [PaymentMethod.Cash, PaymentMethod.Card] as const;

export interface PaymentMethodSheetProps {
  visible: boolean;
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
}

export function PaymentMethodSheet({
  visible,
  selectedMethod,
  onSelect,
  onClose,
}: PaymentMethodSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;

  const handleSelect = (method: PaymentMethod) => {
    onSelect(method);
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={styles.backdropPressable}
        >
          <View style={styles.backdrop} />
        </Pressable>

        <View
          style={[
            styles.panel,
            {
              borderTopLeftRadius: scale * 28,
              borderTopRightRadius: scale * 28,
              gap: scale * 14,
              paddingBottom: insets.bottom + scale * 20,
              paddingHorizontal: scale * 16,
              paddingTop: scale * 12,
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={[styles.title, { fontSize: scale * 18 }]}>{t('payment.methodsTitle')}</Text>

          <View style={{ gap: scale * 10 }}>
            {PAYMENT_METHODS.map((method) => {
              const selected = selectedMethod === method;
              const label = method === PaymentMethod.Cash ? t('payment.cash') : t('payment.card');

              return (
                <Pressable key={method} onPress={() => handleSelect(method)}>
                  <GlassCard tone={selected ? 'selected' : 'default'}>
                    <View style={styles.optionRow}>
                      <PaymentMethodIcon method={method} size={scale * 36} />
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            fontSize: scale * 15,
                            fontWeight: selected ? '600' : '500',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                      {selected ? (
                        <Text style={[styles.checkmark, { fontSize: scale * 18 }]}>✓</Text>
                      ) : (
                        <View style={styles.checkPlaceholder} />
                      )}
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(46,35,49,0.35)',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  checkPlaceholder: {
    width: 18,
  },
  checkmark: {
    color: GLASS_COLORS.brand,
    fontWeight: '700',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(169,159,166,0.45)',
    borderRadius: 999,
    height: 4,
    width: 40,
  },
  optionLabel: {
    color: GLASS_COLORS.title,
    flex: 1,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  panel: {
    backgroundColor: GLASS_COLORS.background,
    borderColor: GLASS_COLORS.cardBorder,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: GLASS_COLORS.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    color: GLASS_COLORS.title,
    fontWeight: '600',
    textAlign: 'center',
  },
});
