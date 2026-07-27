import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { OrderEstimate, PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import { formatDuration, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';

import { PaymentMethodIcon } from './payment-method-icon';
import { TariffIcon, resolveTariffIconVariant } from './tariff-icon';

const sheetColors = {
  background: '#FFFBF7',
  border: 'rgba(255,255,255,0.95)',
  shadow: 'rgba(89,71,31,0.12)',
  label: '#7A6E78',
  text: '#2E2331',
  divider: '#E8E0D4',
  pickupDot: '#E8C882',
  dropoffDot: '#2E2331',
  tariffSelectedBg: '#FCF4E4',
  tariffSelectedBorder: '#E8C882',
  tariffBg: '#FFFFFF',
  tariffBorder: 'rgba(232,224,212,0.9)',
  paymentBg: '#FFFFFF',
  paymentBorder: 'rgba(232,224,212,0.9)',
  buttonStart: '#5A2E60',
  buttonEnd: '#3A1D3F',
  buttonText: '#F7F3EE',
  buttonShadow: 'rgba(89,71,31,0.1)',
  error: '#B42318',
} as const;

const SHEET_MARGIN = 16;
const TARIFF_ROW_PADDING = 18;
const TARIFF_GAP = 6;
const TARIFF_ICON_SIZE = 28;

export interface HomeOrderSheetProps {
  pickupAddress: string;
  dropoffAddress: string;
  estimate: OrderEstimate | null;
  isEstimating: boolean;
  selectedTariffId: string | null;
  paymentLabel: string;
  paymentMethod: PaymentMethod;
  fromLabel: string;
  toLabel: string;
  paymentMethodLabel: string;
  priceFromLabel: (price: string) => string;
  orderLabel: string;
  loadingLabel: string;
  error?: string | null;
  isOrdering: boolean;
  canOrder: boolean;
  bottomInset: number;
  onPickupPress: () => void;
  onDropoffPress: () => void;
  onTariffPress: (tariffId: string) => void;
  onPaymentPress: () => void;
  onOrder: () => void;
}

function TariffCard({
  estimate,
  isSelected,
  onPress,
  priceFromLabel,
  width,
}: {
  estimate: OrderEstimate;
  isSelected: boolean;
  onPress: () => void;
  priceFromLabel: (price: string) => string;
  width: number;
}) {
  const iconVariant = resolveTariffIconVariant(estimate.tariff.name);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tariffCard,
        { width },
        isSelected ? styles.tariffCardSelected : styles.tariffCardDefault,
      ]}
    >
      <TariffIcon selected={isSelected} size={TARIFF_ICON_SIZE} variant={iconVariant} />

      <View style={styles.tariffBody}>
        <Text numberOfLines={1} style={styles.tariffName}>
          {estimate.tariff.name}
        </Text>
        <Text numberOfLines={1} style={styles.tariffEta}>
          ~{formatDuration(estimate.pickupEtaS)}
        </Text>
        <Text numberOfLines={1} style={styles.tariffPrice}>
          {priceFromLabel(formatMoney(estimate.price.estimated, estimate.price.currency))}
        </Text>
      </View>
    </Pressable>
  );
}

export function HomeOrderSheet({
  pickupAddress,
  dropoffAddress,
  estimate,
  isEstimating,
  selectedTariffId,
  paymentLabel,
  paymentMethod,
  fromLabel,
  toLabel,
  paymentMethodLabel,
  priceFromLabel,
  orderLabel,
  loadingLabel,
  error,
  isOrdering,
  canOrder,
  bottomInset,
  onPickupPress,
  onDropoffPress,
  onTariffPress,
  onPaymentPress,
  onOrder,
}: HomeOrderSheetProps) {
  const { width: screenWidth } = useWindowDimensions();
  const showEstimate = estimate && selectedTariffId === estimate.tariff.id;
  const tariffEstimates = showEstimate && estimate ? [estimate] : [];
  const tariffCount = tariffEstimates.length || 1;
  const tariffRowWidth = screenWidth - SHEET_MARGIN * 2 - TARIFF_ROW_PADDING * 2;
  const tariffCardWidth =
    tariffEstimates.length <= 1
      ? 88
      : Math.floor((tariffRowWidth - TARIFF_GAP * (tariffCount - 1)) / tariffCount);

  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingBottom: bottomInset }]}>
      <View style={styles.sheet}>
        <View style={styles.addressBlock}>
          <Pressable onPress={onPickupPress} style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: sheetColors.pickupDot }]} />
            <View style={styles.addressText}>
              <Text style={styles.addressLabel}>{fromLabel}</Text>
              <Text numberOfLines={1} style={styles.addressValue}>
                {pickupAddress}
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={onDropoffPress} style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: sheetColors.dropoffDot }]} />
            <View style={styles.addressText}>
              <Text style={styles.addressLabel}>{toLabel}</Text>
              <Text numberOfLines={1} style={styles.addressValue}>
                {dropoffAddress}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {isEstimating && !estimate ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color={sheetColors.text} />
            <Text style={styles.loaderText}>{loadingLabel}</Text>
          </View>
        ) : null}

        {showEstimate ? (
          <View
            style={[styles.tariffRow, tariffEstimates.length <= 1 ? styles.tariffRowSingle : null]}
          >
            {tariffEstimates.map((item) => (
              <TariffCard
                estimate={item}
                isSelected={selectedTariffId === item.tariff.id}
                key={item.tariff.id}
                onPress={() => onTariffPress(item.tariff.id)}
                priceFromLabel={priceFromLabel}
                width={tariffCardWidth}
              />
            ))}
          </View>
        ) : null}

        <Pressable onPress={onPaymentPress} style={styles.paymentRow}>
          <PaymentMethodIcon method={paymentMethod} />
          <Text numberOfLines={1} style={styles.paymentLine}>
            <Text style={styles.paymentLabel}>{paymentMethodLabel}</Text>
            <Text style={styles.paymentValue}> · {paymentLabel}</Text>
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canOrder || isOrdering}
          onPress={onOrder}
          style={({ pressed }) => [
            styles.orderButtonWrap,
            { opacity: !canOrder ? 0.45 : pressed ? 0.92 : 1 },
          ]}
        >
          <LinearGradient
            colors={[sheetColors.buttonStart, sheetColors.buttonEnd]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={styles.orderButton}
          >
            <Text style={styles.orderButtonText}>{isOrdering ? loadingLabel : orderLabel}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addressBlock: {
    gap: 2,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  addressDot: {
    borderRadius: 999,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  addressLabel: {
    color: sheetColors.label,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },
  addressText: {
    flex: 1,
    gap: 1,
  },
  addressValue: {
    color: sheetColors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  chevron: {
    color: sheetColors.label,
    fontSize: 16,
    lineHeight: 20,
  },
  divider: {
    backgroundColor: sheetColors.divider,
    height: 1,
    marginHorizontal: 16,
    marginVertical: 2,
  },
  error: {
    color: sheetColors.error,
    fontSize: 12,
    paddingHorizontal: 19,
    paddingTop: 4,
    textAlign: 'center',
  },
  loaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loaderText: {
    color: sheetColors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  orderButton: {
    alignItems: 'center',
    borderRadius: 24,
    elevation: 3,
    height: 48,
    justifyContent: 'center',
    shadowColor: sheetColors.buttonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  orderButtonText: {
    color: sheetColors.buttonText,
    fontSize: 15,
    fontWeight: '600',
  },
  orderButtonWrap: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  paymentLine: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
  },
  paymentLabel: {
    color: sheetColors.label,
    fontSize: 13,
    fontWeight: '500',
  },
  paymentRow: {
    alignItems: 'center',
    backgroundColor: sheetColors.paymentBg,
    borderColor: sheetColors.paymentBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  paymentValue: {
    color: sheetColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  root: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  sheet: {
    backgroundColor: sheetColors.background,
    borderColor: sheetColors.border,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 8,
    marginHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 6,
    shadowColor: sheetColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  tariffBody: {
    alignItems: 'center',
    gap: 1,
    width: '100%',
  },
  tariffCard: {
    alignItems: 'center',
    borderRadius: 12,
    gap: 3,
    height: 78,
    paddingBottom: 4,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  tariffCardDefault: {
    backgroundColor: sheetColors.tariffBg,
    borderColor: sheetColors.tariffBorder,
    borderWidth: 1,
  },
  tariffCardSelected: {
    backgroundColor: sheetColors.tariffSelectedBg,
    borderColor: sheetColors.tariffSelectedBorder,
    borderWidth: 1.5,
  },
  tariffEta: {
    color: sheetColors.label,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
    textAlign: 'center',
  },
  tariffName: {
    color: sheetColors.text,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    textAlign: 'center',
  },
  tariffPrice: {
    color: sheetColors.text,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 1,
    textAlign: 'center',
  },
  tariffRow: {
    flexDirection: 'row',
    gap: TARIFF_GAP,
    paddingHorizontal: TARIFF_ROW_PADDING,
    paddingTop: 6,
  },
  tariffRowSingle: {
    justifyContent: 'center',
  },
});
