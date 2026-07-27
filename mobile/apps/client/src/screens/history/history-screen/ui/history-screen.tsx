/** История поездок — `GET /orders/history` (M6.4, Figma node 39:1094). */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { ReviewTarget } from '@nurtaxi/shared-core/shared/model';
import type { OrderHistoryItem } from '@nurtaxi/shared-core/shared/model';
import { EmptyState, ErrorView, Loader, Text } from '@nurtaxi/shared-core/shared/ui';
import { useGetOrderHistoryQuery } from '@nurtaxi/shared-core/entities/order';

import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';
import { WelcomeGradientBackground } from '@/shared/ui/welcome-gradient-background';

import { formatRatingStars, formatTripHistoryDate } from './format-trip-date';
import { TripHistoryCard } from './trip-history-card';

const PAGE_SIZE = 20;

const colors = {
  background: '#F8F4EF',
  brand: '#3A1D3F',
  title: '#2E2331',
} as const;

const logoAsset = require('@/assets/images/welcome/logo.png');
const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const tabBarInset = useGlassTabBarInset();

  const { data, isLoading, isFetching, error, refetch } = useGetOrderHistoryQuery({
    limit: PAGE_SIZE,
  });

  const dateLabels = useMemo(
    () => ({
      today: (time: string) => t('history.today', { time }),
      yesterday: (time: string) => t('history.yesterday', { time }),
      dateAt: (date: string, time: string) => t('history.dateAt', { date, time }),
    }),
    [t],
  );

  const renderItem = useCallback(
    ({ item }: { item: OrderHistoryItem }) => {
      const driverReview = item.reviews.find((review) => review.target === ReviewTarget.Driver);
      const price = item.receiptAmount ?? item.order.priceFinal ?? item.order.priceEstimated ?? 0;

      return (
        <TripHistoryCard
          dateLabel={formatTripHistoryDate(item.order.createdAt, dateLabels)}
          dropoffAddress={item.order.dropoffAddress}
          onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.order.id } })}
          pickupAddress={item.order.pickupAddress}
          priceLabel={formatMoney(price, 'RUB')}
          ratingStars={driverReview ? formatRatingStars(driverReview.rating) : null}
        />
      );
    },
    [dateLabels, router],
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <WelcomeGradientBackground />
        <Loader label={t('common.loading')} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <WelcomeGradientBackground />
        <View style={styles.errorWrap}>
          <ErrorView error={toAppError(error)} onRetry={refetch} retryLabel={t('common.retry')} />
        </View>
      </View>
    );
  }

  const logoWidth = scale * 50;
  const logoHeight = scale * 39;
  const logoRenderWidth = logoWidth * 1.3507;
  const logoCropOffsetX = logoWidth * 0.3507;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeGradientBackground />

      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseTopAsset}
        style={[
          styles.ellipse,
          {
            height: scale * 560,
            left: scale * -90,
            top: scale * -190,
            width: scale * 560,
          },
        ]}
      />

      <FlatList
        ListEmptyComponent={
          <View style={{ paddingTop: scale * 40 }}>
            <EmptyState title={t('order.empty')} />
          </View>
        }
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + scale * 8 }}>
            <View style={styles.brandRow}>
              <View style={[styles.logoClip, { height: logoHeight, width: logoWidth }]}>
                <Image
                  contentFit="fill"
                  source={logoAsset}
                  style={{
                    height: logoHeight * 1.0017,
                    marginLeft: -logoCropOffsetX,
                    width: logoRenderWidth,
                  }}
                />
              </View>
            </View>
            <Text style={[styles.title, { fontSize: scale * 17, marginTop: scale * 12 }]}>
              {t('profile.tripHistory')}
            </Text>
          </View>
        }
        contentContainerStyle={{
          gap: scale * 22,
          paddingBottom: tabBarInset + scale * 24,
          paddingHorizontal: scale * 16,
          paddingTop: scale * 8,
        }}
        data={data ?? []}
        keyExtractor={(item) => item.order.id}
        onRefresh={refetch}
        refreshing={isFetching}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.brand,
    fontWeight: '600',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  ellipse: {
    position: 'absolute',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoClip: {
    overflow: 'hidden',
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.title,
    fontWeight: '600',
    marginBottom: 8,
  },
});
