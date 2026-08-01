/**
 * Карточка входящего заказа (M8.3): адреса, цена и обратный отсчёт до истечения предложения.
 */
import { StyleSheet, View } from 'react-native';

import { formatDistance, formatDuration, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import type { OrderOfferEvent } from '@nurtaxi/shared-core/features/realtime';

import { PillButton } from '@/shared/ui/pill-button';

/** Ширина полосы отсчёта: предложение живёт 30 секунд (`OFFER_TTL_SEC` на сервере). */
const OFFER_TTL_SEC = 30;

export interface IncomingOrderCardProps {
  offer: OrderOfferEvent;
  secondsLeft: number;
  accepting?: boolean;
  error?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingOrderCard({
  offer,
  secondsLeft,
  accepting = false,
  error,
  onAccept,
  onDecline,
}: IncomingOrderCardProps) {
  const theme = useTheme();
  const progress = Math.min(1, Math.max(0, secondsLeft / OFFER_TTL_SEC));

  const meta = [
    offer.distanceM === null ? null : formatDistance(offer.distanceM),
    offer.durationS === null ? null : formatDuration(offer.durationS),
    offer.paymentMethod === PaymentMethod.Cash ? 'Наличные' : 'Карта',
  ].filter(Boolean);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.xl,
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text variant="subtitle">Новый заказ</Text>
        <Text style={{ color: theme.colors.accent }} variant="bodyStrong">
          {secondsLeft} с
        </Text>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.pill,
          height: 4,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.primary,
            height: '100%',
            width: `${progress * 100}%`,
          }}
        />
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <Text numberOfLines={2} variant="body">
          {offer.pickup.address}
        </Text>
        <Text numberOfLines={2} tone="muted" variant="caption">
          → {offer.dropoff.address}
        </Text>
      </View>

      <View style={styles.headerRow}>
        <Text variant="title">{formatMoney(offer.price)}</Text>
        {meta.length > 0 ? (
          <Text tone="muted" variant="caption">
            {meta.join(' · ')}
          </Text>
        ) : null}
      </View>

      {offer.comment ? (
        <Text tone="muted" variant="caption">
          Комментарий: {offer.comment}
        </Text>
      ) : null}

      {error ? (
        <Text tone="danger" variant="caption">
          {error}
        </Text>
      ) : null}

      <View style={[styles.actions, { gap: theme.spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <PillButton
            disabled={accepting}
            onPress={onDecline}
            title="Отклонить"
            variant="surface"
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <PillButton
            disabled={accepting || secondsLeft === 0}
            loading={accepting}
            onPress={onAccept}
            title="Принять"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  card: {
    borderWidth: 1,
    elevation: 6,
    shadowColor: 'rgba(89,71,31,0.20)',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
