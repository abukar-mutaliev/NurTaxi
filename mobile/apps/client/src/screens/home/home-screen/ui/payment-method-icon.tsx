import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { StyleSheet, View } from 'react-native';

import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';

type SymbolName = NonNullable<SymbolViewProps['name']>;

const paymentSymbols: Record<PaymentMethod, SymbolName> = {
  cash: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
  card: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
};

const colors = {
  icon: '#3A1D3F',
  ring: '#E8C882',
  background: 'rgba(252,244,228,0.98)',
} as const;

export interface PaymentMethodIconProps {
  method: PaymentMethod;
  size?: number;
}

export function PaymentMethodIcon({ method, size = 30 }: PaymentMethodIconProps) {
  const iconSize = Math.round(size * 0.5);

  return (
    <View
      style={[
        styles.outer,
        {
          height: size,
          width: size,
        },
      ]}
    >
      <SymbolView
        name={paymentSymbols[method]}
        resizeMode="scaleAspectFit"
        size={iconSize}
        tintColor={colors.icon}
        type="hierarchical"
        weight={{ ios: 'semibold', android: medium }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.ring,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
