/** История поездок — `GET /orders/history` (M6.4, `§8.13`). */
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatDateTime, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import {
  Badge,
  Card,
  EmptyState,
  ErrorView,
  Loader,
  Screen,
  Text,
  useTheme,
} from '@nurtaxi/shared-core/shared/ui';
import {
  orderStatusLabelKey,
  orderStatusTone,
  useGetOrderHistoryQuery,
} from '@nurtaxi/shared-core/entities/order';

const PAGE_SIZE = 20;

export function HistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const { data, isLoading, isFetching, error, refetch } = useGetOrderHistoryQuery({
    limit: PAGE_SIZE,
  });

  if (isLoading) {
    return (
      <Screen>
        <Loader label={t('common.loading')} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorView error={toAppError(error)} onRetry={refetch} retryLabel={t('common.retry')} />
      </Screen>
    );
  }

  return (
    <Screen edgeToEdge>
      <FlatList
        ListEmptyComponent={<EmptyState title={t('order.empty')} />}
        contentContainerStyle={{ gap: theme.spacing.md, padding: theme.spacing.lg }}
        data={data ?? []}
        keyExtractor={(item) => item.order.id}
        onRefresh={refetch}
        refreshing={isFetching}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/order/${item.order.id}`)}>
            <Card>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text tone="muted" variant="caption">
                  {formatDateTime(item.order.createdAt)}
                </Text>
                <Badge
                  label={t(orderStatusLabelKey(item.order.status))}
                  tone={orderStatusTone(item.order.status)}
                />
              </View>

              <Text variant="bodyStrong">{item.order.dropoffAddress}</Text>
              <Text tone="muted" variant="caption">
                {item.order.pickupAddress}
              </Text>
              <Text variant="bodyStrong">
                {formatMoney(item.order.priceFinal ?? item.order.priceEstimated)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
