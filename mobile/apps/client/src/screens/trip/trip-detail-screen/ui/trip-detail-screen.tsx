/**
 * Детали завершённой поездки из истории (M6.5).
 */
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { formatDateTime, formatMoney, formatRating } from '@nurtaxi/shared-core/shared/lib';
import { OrderStatus, ReviewTarget } from '@nurtaxi/shared-core/shared/model';
import { Avatar, Badge, Text } from '@nurtaxi/shared-core/shared/ui';
import {
  formatOrderStatusLabel,
  orderStatusTone,
  useGetOrderHistoryQuery,
  useGetOrderQuery,
} from '@nurtaxi/shared-core/entities/order';

import { ReviewSheet } from '@/features/review';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenShell,
  GlassSectionLabel,
} from '@/shared/ui';

export function TripDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetOrderQuery(id ?? '', {
    skip: !id,
  });
  const { data: history } = useGetOrderHistoryQuery({ limit: 100 });

  const [reviewVisible, setReviewVisible] = useState(false);

  const historyItem = useMemo(() => history?.find((item) => item.order.id === id), [history, id]);

  const hasReview = useMemo(
    () => historyItem?.reviews.some((review) => review.target === ReviewTarget.Driver) ?? false,
    [historyItem],
  );

  const canReview =
    order &&
    (order.status === OrderStatus.Completed ||
      order.status === OrderStatus.Closed ||
      order.status === OrderStatus.FailedPayment) &&
    !hasReview;

  const canShowReceipt =
    order && (order.status === OrderStatus.Closed || historyItem?.receiptNumber != null);

  if (!id) {
    return (
      <GlassScreenShell title={t('trip.detailsTitle')}>
        <Text style={{ color: GLASS_COLORS.error, textAlign: 'center' }}>
          {t('errors.NOT_FOUND')}
        </Text>
      </GlassScreenShell>
    );
  }

  if (isLoading && !order) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  if (isError || !order) {
    return (
      <GlassScreenShell error={error} isError onRetry={refetch} retryLabel={t('common.retry')} />
    );
  }

  return (
    <>
      <GlassScreenShell title={t('trip.detailsTitle')}>
        <GlassCard>
          <View
            style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <GlassCaption>{formatDateTime(order.createdAt)}</GlassCaption>
            <Badge
              label={formatOrderStatusLabel(order.status)}
              tone={orderStatusTone(order.status)}
            />
          </View>

          <View style={{ gap: scale * 6, paddingTop: scale * 8 }}>
            <GlassSectionLabel>{t('order.from')}</GlassSectionLabel>
            <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15 }}>
              {order.pickupAddress}
            </Text>
            <GlassSectionLabel>{t('order.to')}</GlassSectionLabel>
            <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15 }}>
              {order.dropoffAddress}
            </Text>
          </View>

          <Text
            style={{
              color: GLASS_COLORS.title,
              fontSize: scale * 24,
              fontWeight: '600',
              paddingTop: scale * 12,
            }}
          >
            {formatMoney(order.priceFinal ?? order.priceEstimated, 'RUB')}
          </Text>

          {order.tariff ? (
            <GlassCaption>
              {t('order.tariff')}: {order.tariff.name}
            </GlassCaption>
          ) : null}
        </GlassCard>

        {order.driver ? (
          <GlassCard>
            <GlassSectionLabel>{t('order.driver')}</GlassSectionLabel>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: scale * 14,
                paddingTop: scale * 8,
              }}
            >
              <Avatar name={order.driver.fullName} size={48} />
              <View style={{ flex: 1, gap: scale * 4 }}>
                <Text
                  style={{ color: GLASS_COLORS.title, fontSize: scale * 15, fontWeight: '600' }}
                >
                  {order.driver.fullName}
                </Text>
                <GlassCaption>
                  {t('driver.rating')}: {formatRating(order.driver.rating)}
                </GlassCaption>
                {order.driver.vehicle ? (
                  <GlassCaption>
                    {order.driver.vehicle.make} {order.driver.vehicle.model} ·{' '}
                    {order.driver.vehicle.plateNumber}
                  </GlassCaption>
                ) : null}
              </View>
            </View>
          </GlassCard>
        ) : null}

        {order.status === OrderStatus.FailedPayment ? (
          <GlassCard tone="warning">
            <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15, fontWeight: '600' }}>
              {t('payment.failed')}
            </Text>
            <GlassCaption>{t('payment.failedHint')}</GlassCaption>
          </GlassCard>
        ) : null}

        <View style={{ gap: scale * 10 }}>
          {canShowReceipt ? (
            <GlassPrimaryButton
              onPress={() => router.push({ pathname: '/trip/[id]/receipt', params: { id } })}
              scale={scale}
              title={t('order.receipt')}
              variant="secondary"
            />
          ) : null}
          {canReview ? (
            <GlassPrimaryButton
              onPress={() => setReviewVisible(true)}
              scale={scale}
              title={t('review.title')}
            />
          ) : hasReview ? (
            <GlassCaption>{t('review.thanks')}</GlassCaption>
          ) : null}
        </View>
      </GlassScreenShell>

      <ReviewSheet
        onClose={() => setReviewVisible(false)}
        onSubmitted={refetch}
        orderId={id}
        visible={reviewVisible}
      />
    </>
  );
}
