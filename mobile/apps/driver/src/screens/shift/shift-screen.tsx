/**
 * Рабочий экран смены (M8.1–M8.3): карта, переключатель линии и сводка за день.
 *
 * Источник истины по статусу — сервер (`PATCH /driver/status`). Локальный слайс `shift`
 * держит оптимистичное значение, чтобы переключатель не «залипал» при плохой связи,
 * а при отказе сервера возвращается назад.
 */
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatMoney, formatRating } from '@nurtaxi/shared-core/shared/lib';
import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import {
  useAcceptDriverOrderMutation,
  useGetDriverEarningsQuery,
  useGetDriverProfileQuery,
  useUpdateDriverStatusMutation,
} from '@nurtaxi/shared-core/entities/driver';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useDriverLocationTracking } from '@/features/location-tracking';
import { IncomingOrderCard, useOrderOffer } from '@/features/order-offer';
import { onlineIntentChanged, selectWantsOnline } from '@/processes/shift';
import { getGlassTabBarBottomInset } from '@/shared/constants/glass-tab-bar';
import { RoundButton } from '@/shared/ui/round-button';
import { StatTiles } from '@/shared/ui/stat-tiles';
import { MapCanvas } from '@/widgets/map';

export function ShiftScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const wantsOnline = useAppSelector(selectWantsOnline);
  const { data: profile } = useGetDriverProfileQuery();
  const { data: earnings } = useGetDriverEarningsQuery();
  const [updateStatus, { isLoading: switching }] = useUpdateDriverStatusMutation();

  const [error, setError] = useState<string | null>(null);

  // --- Входящий заказ (M8.3) ---
  const { offer, secondsLeft, dismiss } = useOrderOffer();
  const [acceptOrder, { isLoading: accepting }] = useAcceptDriverOrderMutation();
  const [offerError, setOfferError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!offer) {
      return;
    }
    setOfferError(null);
    try {
      await acceptOrder(offer.orderId).unwrap();
      dismiss();
      router.push(`/order/${offer.orderId}`);
    } catch (cause) {
      setOfferError(toAppError(cause as never).message);
    }
  };

  const handleDecline = () => {
    setOfferError(null);
    dismiss();
  };

  const isOnline = profile?.onlineStatus === 'online' || (wantsOnline && !profile);
  const canGoOnline = profile?.canGoOnline ?? false;

  // Источник истины — серверный статус: так трансляция позиции переживает перезапуск
  // приложения посреди смены и не запускается по одному лишь оптимистичному переключателю.
  useDriverLocationTracking(profile?.onlineStatus === 'online');

  const toggleOnline = async (next: boolean) => {
    setError(null);
    // Оптимистично двигаем переключатель, чтобы отклик был мгновенным.
    dispatch(onlineIntentChanged(next));
    try {
      await updateStatus({ status: next ? 'online' : 'offline' }).unwrap();
    } catch (cause) {
      dispatch(onlineIntentChanged(!next));
      setError(toAppError(cause as never).message);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={StyleSheet.absoluteFill}>
        <MapCanvas showsUserLocation />
      </View>

      {/* Верхний ряд: индикатор смены, статус, профиль */}
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
          accessibilityLabel={isOnline ? t('driver.online') : t('driver.offline')}
          variant="surface"
        >
          <View
            style={{
              backgroundColor: isOnline ? theme.colors.success : theme.colors.primary,
              borderRadius: 999,
              height: 12,
              width: 12,
            }}
          />
        </RoundButton>

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
          <Text variant="bodyStrong">{isOnline ? 'Вы на линии' : 'Вы офлайн'}</Text>
        </View>

        <RoundButton
          accessibilityLabel={t('profile.title')}
          onPress={() => router.push('/(tabs)/profile')}
          variant="surface"
        >
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

      {/*
        Входящий заказ занимает место сводки: пока предложение живёт (30 секунд),
        это единственное, что водителю нужно на экране.
      */}
      {offer ? (
        <View
          style={[
            styles.offerWrap,
            {
              paddingBottom: getGlassTabBarBottomInset(insets.bottom),
              paddingHorizontal: theme.spacing.md,
            },
          ]}
        >
          <IncomingOrderCard
            accepting={accepting}
            error={offerError}
            offer={offer}
            onAccept={() => {
              void handleAccept();
            }}
            onDecline={handleDecline}
            secondsLeft={secondsLeft}
          />
        </View>
      ) : null}

      {/* Нижняя карточка: переключатель линии и сводка */}
      <View
        style={[
          styles.sheet,
          offer && styles.hidden,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            gap: theme.spacing.md,
            // Таб-бар «висит» поверх карточки — поднимаем её содержимое над ним.
            paddingBottom: getGlassTabBarBottomInset(insets.bottom) + theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
          },
        ]}
      >
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text variant="bodyStrong">
              {isOnline ? t('driver.goOffline') : t('driver.goOnline')}
            </Text>
            <Text tone="muted" variant="caption">
              {canGoOnline
                ? 'Нажмите, чтобы начать принимать заказы'
                : 'Выйти на линию можно после одобрения документов'}
            </Text>
          </View>
          <Switch
            disabled={!canGoOnline || switching}
            ios_backgroundColor={theme.colors.surfaceMuted}
            onValueChange={toggleOnline}
            thumbColor={theme.colors.surface}
            trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
            value={isOnline}
          />
        </View>

        {error ? (
          <Text tone="danger" variant="caption">
            {error}
          </Text>
        ) : null}

        <StatTiles
          tiles={[
            {
              label: t('driver.earningsToday'),
              value: formatMoney(earnings?.today ?? 0),
            },
            { label: t('driver.trips'), value: String(profile?.tripsCount ?? 0) },
            { label: t('driver.rating'), value: formatRating(profile?.rating ?? 5) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    display: 'none',
  },
  offerWrap: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
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
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
