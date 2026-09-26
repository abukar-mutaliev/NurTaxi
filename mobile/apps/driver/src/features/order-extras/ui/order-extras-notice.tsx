/**
 * Пожелания клиента на карточке заказа: кресло, пассажир, комментарий.
 */
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  formatPassengerPhone,
  hasOrderExtras,
  resolveOrderExtras,
  type OrderExtrasSource,
} from '@nurtaxi/shared-core/entities/order';
import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

export interface OrderExtrasNoticeProps {
  source: OrderExtrasSource;
  compact?: boolean;
  /** На активной поездке телефон пассажира можно набрать. */
  canCallPassenger?: boolean;
}

export function OrderExtrasNotice({
  source,
  compact = false,
  canCallPassenger = false,
}: OrderExtrasNoticeProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const extras = resolveOrderExtras(source);

  if (!hasOrderExtras(extras)) {
    return null;
  }

  const phoneLabel = formatPassengerPhone(extras.passengerPhone);
  const callPassenger = () => {
    if (!extras.passengerPhone) {
      return;
    }
    void Linking.openURL(`tel:${extras.passengerPhone}`);
  };

  if (compact) {
    const chips = [
      extras.childSeat ? t('driver.childSeat') : null,
      extras.passengerName
        ? t('driver.orderForOtherPassenger', { name: extras.passengerName })
        : null,
      extras.comment,
    ].filter(Boolean);

    return (
      <Text numberOfLines={2} tone="muted" variant="micro">
        {chips.join(' · ')}
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.lg,
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
        },
      ]}
    >
      {extras.childSeat ? <Text variant="bodyStrong">{t('driver.childSeat')}</Text> : null}

      {extras.passengerName ? (
        <View style={{ gap: 2 }}>
          <Text tone="muted" variant="label">
            {t('driver.orderForOther')}
          </Text>
          <Text variant="bodyStrong">{extras.passengerName}</Text>
          {phoneLabel ? (
            canCallPassenger ? (
              <Pressable accessibilityRole="button" onPress={callPassenger}>
                <Text style={{ color: theme.colors.accent }} variant="caption">
                  {phoneLabel}
                </Text>
              </Pressable>
            ) : (
              <Text variant="caption">{phoneLabel}</Text>
            )
          ) : null}
        </View>
      ) : null}

      {extras.comment ? (
        <View style={{ gap: 2 }}>
          <Text tone="muted" variant="label">
            {t('driver.clientComment')}
          </Text>
          <Text variant="caption">{extras.comment}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});
