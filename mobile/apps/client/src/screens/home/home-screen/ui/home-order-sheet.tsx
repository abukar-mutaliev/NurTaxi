import { useState, type ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';

import type { OrderEstimate, PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import { formatDuration, formatPrice } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';

import { useKeyboardLift } from '@/shared/hooks/use-keyboard-lift';
import { CollapsibleSheet } from '@/shared/ui';
import { glassShadow } from '@/shared/ui/glass-shadow';

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
  stopDot: '#C99A54',
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
  /** Промежуточная остановка; `null` — её нет, вместо строки показываем «Добавить остановку». */
  stopAddress: string | null;
  dropoffAddress: string;
  estimate: OrderEstimate | null;
  isEstimating: boolean;
  selectedTariffId: string | null;
  paymentLabel: string;
  paymentMethod: PaymentMethod;
  fromLabel: string;
  stopLabel: string;
  addStopLabel: string;
  removeStopLabel: string;
  toLabel: string;
  paymentMethodLabel: string;
  priceFromLabel: (price: string) => string;
  orderLabel: string;
  loadingLabel: string;
  error?: string | null;
  /** Пояснение без тревоги — например, что цена пока без учёта остановки. */
  notice?: string | null;
  isOrdering: boolean;
  canOrder: boolean;
  bottomInset: number;
  onPickupPress: () => void;
  /** Выбор адреса остановки — и для новой, и для уже добавленной. */
  onStopPress: () => void;
  onRemoveStop: () => void;
  onDropoffPress: () => void;
  onTariffPress: (tariffId: string) => void;
  onPaymentPress: () => void;
  onOrder: () => void;
  extras?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
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
          {priceFromLabel(formatPrice(estimate.price.estimated, estimate.price.currency))}
        </Text>
      </View>
    </Pressable>
  );
}

export function HomeOrderSheet({
  pickupAddress,
  stopAddress,
  dropoffAddress,
  estimate,
  isEstimating,
  selectedTariffId,
  paymentLabel,
  paymentMethod,
  fromLabel,
  stopLabel,
  addStopLabel,
  removeStopLabel,
  toLabel,
  paymentMethodLabel,
  priceFromLabel,
  orderLabel,
  loadingLabel,
  error,
  notice,
  isOrdering,
  canOrder,
  bottomInset,
  onPickupPress,
  onStopPress,
  onRemoveStop,
  onDropoffPress,
  onTariffPress,
  onPaymentPress,
  onOrder,
  extras,
  onLayout,
}: HomeOrderSheetProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(0);
  /**
   * Поля «заказ другому» и комментарий лежат внутри листа, прижатого к низу экрана, — без
   * подъёма клавиатура закрывала их целиком. Лист поднимается над ней, но не выше статус-бара.
   */
  const { anchorRef, liftStyle } = useKeyboardLift({ gap: 8 });
  const showEstimate = estimate && selectedTariffId === estimate.tariff.id;
  const tariffEstimates = showEstimate && estimate ? [estimate] : [];
  const tariffCount = tariffEstimates.length || 1;
  const tariffRowWidth = screenWidth - SHEET_MARGIN * 2 - TARIFF_ROW_PADDING * 2;
  const tariffCardWidth =
    tariffEstimates.length <= 1
      ? 88
      : Math.floor((tariffRowWidth - TARIFF_GAP * (tariffCount - 1)) / tariffCount);

  return (
    <Animated.View
      onLayout={onLayout}
      pointerEvents="box-none"
      style={[
        styles.root,
        { paddingBottom: bottomInset },
        sheetHeight > 0 ? { height: sheetHeight + bottomInset } : null,
        liftStyle,
      ]}
    >
      <View collapsable={false} ref={anchorRef} style={styles.sheetFrame}>
        <CollapsibleSheet onVisibleHeightChange={setSheetHeight} style={styles.sheet}>
          <View style={styles.body}>
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

              {stopAddress ? (
                <View style={styles.stopRow}>
                  <Pressable onPress={onStopPress} style={[styles.addressRow, styles.stopMain]}>
                    <View style={[styles.addressDot, { backgroundColor: sheetColors.stopDot }]} />
                    <View style={styles.addressText}>
                      <Text style={styles.addressLabel}>{stopLabel}</Text>
                      <Text numberOfLines={1} style={styles.addressValue}>
                        {stopAddress}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={removeStopLabel}
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={onRemoveStop}
                    style={({ pressed }) => [styles.removeStop, pressed && styles.pressed]}
                  >
                    <Text style={styles.removeStopGlyph}>×</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={{ bottom: 6, top: 6 }}
                  onPress={onStopPress}
                  style={({ pressed }) => [styles.addStopRow, pressed && styles.pressed]}
                >
                  <Text style={styles.addStopGlyph}>+</Text>
                  <Text style={styles.addStopText}>{addStopLabel}</Text>
                </Pressable>
              )}

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
                style={[
                  styles.tariffRow,
                  tariffEstimates.length <= 1 ? styles.tariffRowSingle : null,
                ]}
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

            {extras ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={styles.extras}
              >
                {extras}
              </ScrollView>
            ) : null}

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
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
        </CollapsibleSheet>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  addStopGlyph: {
    color: sheetColors.stopDot,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
    width: 8,
  },
  addStopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },
  addStopText: {
    color: sheetColors.label,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
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
  body: {
    paddingBottom: 10,
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
  extras: {
    maxHeight: 220,
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
  notice: {
    color: sheetColors.label,
    fontSize: 12,
    paddingHorizontal: 19,
    paddingTop: 4,
    textAlign: 'center',
  },
  orderButton: {
    alignItems: 'center',
    borderRadius: 24,
    elevation: 3,
    height: 48,
    justifyContent: 'center',
    ...glassShadow({ color: sheetColors.buttonShadow, offset: { width: 0, height: 4 }, radius: 8 }),
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
  pressed: {
    opacity: 0.7,
  },
  removeStop: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  removeStopGlyph: {
    color: sheetColors.label,
    fontSize: 20,
    lineHeight: 22,
  },
  root: {
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  sheet: {
    backgroundColor: sheetColors.background,
    borderColor: sheetColors.border,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stopMain: {
    flex: 1,
  },
  stopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sheetFrame: {
    borderRadius: 22,
    elevation: 8,
    marginHorizontal: 16,
    ...glassShadow({ color: sheetColors.shadow, radius: 16 }),
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
