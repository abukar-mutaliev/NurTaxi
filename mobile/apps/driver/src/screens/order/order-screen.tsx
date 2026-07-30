/**
 * Выполнение заказа водителем (M8.4–M8.8).
 *
 * Экран ведёт водителя по конечному автомату заказа `§12.1`:
 * `driver_assigned → driver_en_route → driver_arrived → in_progress → completed`.
 * Каждое действие уходит в `POST /driver/orders/{id}/status`; следующий шаг вычисляется
 * из статуса, полученного от сервера, а не хранится локально.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatDistance, formatDuration, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { DriverOrderAction, OrderStatus } from '@nurtaxi/shared-core/shared/model';
import { Loader, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useUpdateDriverOrderStatusMutation } from '@nurtaxi/shared-core/entities/driver';
import { useGetOrderQuery, useGetReceiptQuery } from '@nurtaxi/shared-core/entities/order';

import { GlowIcon } from '@/shared/ui/glow-icon';
import { PillButton } from '@/shared/ui/pill-button';
import { RoundButton } from '@/shared/ui/round-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';
import { StatTiles } from '@/shared/ui/stat-tiles';
import { MapCanvas } from '@/widgets/map';

/** Следующий шаг водителя по текущему статусу заказа. */
function nextStep(status: string, t: (key: string) => string) {
  switch (status) {
    case OrderStatus.DriverAssigned:
      return { headline: 'Заказ принят', action: DriverOrderAction.EnRoute, label: 'Выезжаю' };
    case OrderStatus.DriverEnRoute:
      return {
        headline: 'Едете к клиенту',
        action: DriverOrderAction.Arrived,
        label: t('driver.arrived'),
      };
    case OrderStatus.DriverArrived:
      return {
        headline: 'Ожидаете пассажира',
        action: DriverOrderAction.Start,
        label: t('driver.startTrip'),
      };
    case OrderStatus.InProgress:
      return {
        headline: 'В пути',
        action: DriverOrderAction.Complete,
        label: t('driver.completeTrip'),
      };
    default:
      return null;
  }
}

/**
 * Комиссия и итоговый доход считаются на сервере (`commission_percent` тарифа региона)
 * и в мобильный API не приходят. Показываем их только если сервер положил значения
 * в чек — выдумывать суммы в деньгах водителя нельзя.
 */
function readMoneyField(payload: Record<string, unknown> | undefined, keys: string[]) {
  if (!payload) {
    return null;
  }
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function OrderScreen({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: order, isLoading } = useGetOrderQuery(orderId, { skip: !orderId });
  const [updateStatus, { isLoading: updating }] = useUpdateDriverOrderStatusMutation();
  const [error, setError] = useState<string | null>(null);

  const orderFinished =
    order?.status === OrderStatus.Completed || order?.status === OrderStatus.Closed;
  // Разбивку по деньгам считает сервер — берём её из чека, а не пересчитываем на клиенте.
  const { data: receipt } = useGetReceiptQuery(orderId, { skip: !orderId || !orderFinished });

  if (isLoading || !order) {
    return (
      <View style={styles.root}>
        <ScreenGradientBackground tone="rose" />
        <Loader />
      </View>
    );
  }

  // ---------- Поездка завершена ----------
  if (orderFinished) {
    const total = order.priceFinal ?? order.priceEstimated;
    const commission = readMoneyField(receipt?.payload, [
      'commission',
      'commissionAmount',
      'platformCommission',
    ]);
    const income =
      readMoneyField(receipt?.payload, ['driverIncome', 'driverEarnings', 'payoutAmount']) ??
      (commission === null ? null : total - commission);

    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGradientBackground tone="rose" />
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + theme.spacing.xl,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.xxxl,
          }}
        >
          <View style={styles.finishedBody}>
            <GlowIcon glyph="✓" size={92} />
            <Text align="center" style={{ marginTop: theme.spacing.lg }} variant="subtitle">
              Поездка завершена
            </Text>
            <Text
              align="center"
              style={{ marginTop: theme.spacing.xs }}
              tone="muted"
              variant="caption"
            >
              Оплата зачислена на баланс
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  gap: theme.spacing.sm,
                  marginTop: theme.spacing.xl,
                  padding: theme.spacing.lg,
                  width: '100%',
                },
              ]}
            >
              <View style={styles.moneyRow}>
                <Text tone="muted" variant="caption">
                  Стоимость поездки
                </Text>
                <Text variant="bodyStrong">{formatMoney(total)}</Text>
              </View>

              {commission !== null ? (
                <>
                  <View style={styles.moneyRow}>
                    <Text tone="muted" variant="caption">
                      Комиссия сервиса
                    </Text>
                    <Text variant="bodyStrong">−{formatMoney(commission)}</Text>
                  </View>
                  <View style={styles.moneyRow}>
                    <Text variant="bodyStrong">Ваш доход</Text>
                    <Text tone="success" variant="bodyStrong">
                      {formatMoney(income ?? 0)}
                    </Text>
                  </View>
                </>
              ) : (
                <Text tone="muted" variant="micro">
                  Комиссия и итоговый доход появятся в чеке и в разделе «Доходы».
                </Text>
              )}
            </View>
          </View>

          <PillButton onPress={() => router.replace('/(tabs)')} title="Продолжить" />
        </View>
      </View>
    );
  }

  // ---------- Активная поездка ----------
  const step = nextStep(order.status, t);

  const advance = async () => {
    if (!step) {
      return;
    }
    setError(null);
    try {
      await updateStatus({ orderId, action: step.action }).unwrap();
    } catch (cause) {
      setError(toAppError(cause as never).message);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={StyleSheet.absoluteFill}>
        <MapCanvas
          initialPoint={{ lat: order.pickupLat, lng: order.pickupLng }}
          routePolyline={order.route?.polyline ?? null}
        />
      </View>

      <View
        style={[
          styles.topBar,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.sm,
          },
        ]}
      >
        <RoundButton
          accessibilityLabel={t('common.back')}
          icon="back"
          onPress={() => router.replace('/(tabs)')}
        />
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
            },
          ]}
        >
          <Text variant="bodyStrong">{step?.headline ?? 'Заказ'}</Text>
        </View>
        <RoundButton accessibilityLabel={t('driver.navigate')} variant="surface">
          <View
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: 999,
              height: 12,
              width: 12,
            }}
          />
        </RoundButton>
      </View>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingBottom: insets.bottom + theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={{ gap: theme.spacing.md }}
          showsVerticalScrollIndicator={false}
        >
          {/* Маршрут */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: 'transparent',
                borderRadius: theme.radius.lg,
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <View style={[styles.addressRow, { gap: theme.spacing.sm }]}>
              <View
                style={{
                  backgroundColor: theme.colors.accent,
                  borderRadius: 999,
                  height: 10,
                  width: 10,
                }}
              />
              <Text style={{ flex: 1 }} variant="caption">
                {order.pickupAddress}
              </Text>
            </View>
            <View style={[styles.addressRow, { gap: theme.spacing.sm }]}>
              <View
                style={{
                  backgroundColor: theme.colors.text,
                  borderRadius: 999,
                  height: 10,
                  width: 10,
                }}
              />
              <Text style={{ flex: 1 }} variant="caption">
                {order.dropoffAddress}
              </Text>
            </View>
          </View>

          {order.comment ? (
            <View>
              <Text tone="muted" variant="label">
                {t('driver.clientComment')}
              </Text>
              <Text variant="caption">{order.comment}</Text>
            </View>
          ) : null}

          <StatTiles
            tiles={[
              {
                label: 'В пути',
                value: order.route ? formatDuration(order.route.durationS) : '—',
              },
              {
                label: 'Расстояние',
                value: order.route ? formatDistance(order.route.distanceM) : '—',
              },
              {
                label: 'Стоимость',
                value: formatMoney(order.priceFinal ?? order.priceEstimated),
              },
            ]}
          />

          {error ? (
            <Text tone="danger" variant="caption">
              {error}
            </Text>
          ) : null}

          {step ? <PillButton loading={updating} onPress={advance} title={step.label} /> : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  card: {
    borderWidth: 1,
    elevation: 1,
    shadowColor: 'rgba(89,71,31,0.07)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  finishedBody: {
    alignItems: 'center',
    flex: 1,
  },
  moneyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    maxHeight: '62%',
    position: 'absolute',
    right: 0,
    shadowColor: 'rgba(89,71,31,0.16)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  statusPill: {
    borderWidth: 1,
    elevation: 2,
    shadowColor: 'rgba(89,71,31,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
