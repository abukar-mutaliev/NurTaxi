/**
 * Мои заказы — история поездок водителя (`§8.13`).
 *
 * Источник — `GET /driver/orders/history`: у клиентского `/orders/history` роль Client,
 * водителю он отвечает 403. Активная поездка выведена отдельной карточкой сверху,
 * чтобы из списка можно было вернуться на рабочий экран заказа.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateTime, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import type { OrderHistoryItem } from '@nurtaxi/shared-core/shared/model';
import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useGetDriverOrderHistoryQuery } from '@nurtaxi/shared-core/entities/driver';
import { formatOrderStatusLabel, isActiveOrder } from '@nurtaxi/shared-core/entities/order';

import { getGlassTabBarBottomInset } from '@/shared/constants/glass-tab-bar';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

export function OrdersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: history = [], isFetching, refetch } = useGetDriverOrderHistoryQuery({ limit: 50 });

  const active = history.filter((item) => isActiveOrder(item.order.status));
  const past = history.filter((item) => !isActiveOrder(item.order.status));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGradientBackground tone="rose" />

      <ScrollView
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: getGlassTabBarBottomInset(insets.bottom) + theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.md,
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void refetch();
            }}
            refreshing={isFetching}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} variant="subtitle">
          {t('tabs.orders')}
        </Text>

        {active.length > 0 ? (
          <>
            <Text tone="muted" variant="label">
              Текущая поездка
            </Text>
            {active.map((item) => (
              <OrderCard
                item={item}
                key={item.order.id}
                onPress={() => router.push(`/order/${item.order.id}`)}
              />
            ))}
          </>
        ) : null}

        <Text style={{ paddingTop: theme.spacing.xs }} tone="muted" variant="label">
          Завершённые
        </Text>

        {past.length === 0 ? (
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
          past.map((item) => <OrderCard item={item} key={item.order.id} />)
        )}
      </ScrollView>
    </View>
  );
}

interface OrderCardProps {
  item: OrderHistoryItem;
  onPress?: () => void;
}

function OrderCard({ item, onPress }: OrderCardProps) {
  const theme = useTheme();
  const { order, receiptAmount } = item;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          gap: theme.spacing.sm,
          opacity: pressed ? 0.9 : 1,
          padding: theme.spacing.lg,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text tone="muted" variant="micro">
          {formatDateTime(order.createdAt)}
        </Text>
        <Text variant="bodyStrong">
          {formatMoney(receiptAmount ?? order.priceFinal ?? order.priceEstimated)}
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        <Text numberOfLines={1} variant="caption">
          {order.pickupAddress}
        </Text>
        <Text numberOfLines={1} tone="muted" variant="caption">
          → {order.dropoffAddress}
        </Text>
      </View>

      <Text style={{ color: theme.colors.accent }} variant="micro">
        {formatOrderStatusLabel(order.status)}
      </Text>
    </Pressable>
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
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  title: {
    textAlign: 'center',
  },
});
