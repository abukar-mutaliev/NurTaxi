/**
 * Доходы водителя (M9.1): баланс, сводка за период и последние поездки.
 *
 * Суммы приходят из `GET /driver/earnings` уже посчитанными на сервере
 * (комиссия удерживается по тарифу региона) — на клиенте ничего не пересчитываем.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useGetDriverEarningsQuery } from '@nurtaxi/shared-core/entities/driver';
import { useGetOrderHistoryQuery } from '@nurtaxi/shared-core/entities/order';

import { RoundButton } from '@/shared/ui/round-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';
import { StatTiles } from '@/shared/ui/stat-tiles';

export function EarningsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data: earnings,
    isFetching: earningsFetching,
    refetch: refetchEarnings,
  } = useGetDriverEarningsQuery();
  const { data: history = [], refetch: refetchHistory } = useGetOrderHistoryQuery({ limit: 20 });

  const refresh = () => {
    void refetchEarnings();
    void refetchHistory();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGradientBackground tone="rose" />

      <ScrollView
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.md,
        }}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={earningsFetching} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <RoundButton
            accessibilityLabel={t('common.back')}
            icon="back"
            onPress={() => router.back()}
          />
          <Text style={styles.headerTitle} variant="subtitle">
            {t('driver.earnings')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Баланс */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Text tone="muted" variant="label">
            {t('driver.balance')}
          </Text>
          <Text variant="display">{formatMoney(earnings?.balance ?? 0)}</Text>
          <StatTiles
            tiles={[
              { label: t('driver.earningsToday'), value: formatMoney(earnings?.today ?? 0) },
              { label: t('driver.earningsWeek'), value: formatMoney(earnings?.week ?? 0) },
              { label: t('driver.earningsMonth'), value: formatMoney(earnings?.month ?? 0) },
            ]}
          />
        </View>

        {/* Последние поездки */}
        <Text style={{ paddingTop: theme.spacing.xs }} variant="bodyStrong">
          Последние поездки
        </Text>

        {history.length === 0 ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <Text tone="muted" variant="caption">
              Пока нет завершённых поездок.
            </Text>
          </View>
        ) : (
          history.map(({ order, receiptAmount }) => (
            <View
              key={order.id}
              style={[
                styles.card,
                styles.tripRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} variant="caption">
                  {order.dropoffAddress}
                </Text>
                <Text tone="muted" variant="micro">
                  {formatDate(order.createdAt)}
                </Text>
              </View>
              <Text variant="bodyStrong">
                {formatMoney(receiptAmount ?? order.priceFinal ?? order.priceEstimated)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    elevation: 1,
    shadowColor: 'rgba(89,71,31,0.07)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  tripRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
