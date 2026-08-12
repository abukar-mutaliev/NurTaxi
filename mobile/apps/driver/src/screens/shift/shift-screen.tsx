/**
 * Рабочий экран смены (M8.1–M8.3): карта, переключатель линии и сводка за день.
 *
 * Источник истины по статусу — сервер (`PATCH /driver/status`). Локальный слайс `shift`
 * держит оптимистичное значение, чтобы переключатель не «залипал» при плохой связи,
 * а при отказе сервера возвращается назад.
 */
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
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
import { useDriverPosition } from '@/features/driver-position';
import { IncomingOrderCard, useOrderOffer } from '@/features/order-offer';
import { onlineIntentChanged, selectWantsOnline, useLocationReporting } from '@/processes/shift';
import { getGlassTabBarBottomInset } from '@/shared/constants/glass-tab-bar';
import { RoundButton } from '@/shared/ui/round-button';
import { StatTiles } from '@/shared/ui/stat-tiles';
import { MapCanvas, type MapCanvasHandle } from '@/widgets/map';

/**
 * Масштаб, на который встаёт карта, показав водителю его позицию: примерно квартал
 * вокруг машины. Обзорный масштаб здесь бесполезен — на нём не понять, где ты стоишь.
 */
const DRIVER_ZOOM_DELTA = 0.01;

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

  // --- Своя позиция на линии ---
  // `error` уже занят отказом переключателя линии — ошибку геопозиции берём под своим именем.
  const {
    position,
    permissionState,
    canAskAgain,
    isLocating,
    openSettings,
    error: positionError,
    request: requestLocation,
  } = useDriverPosition(isOnline);
  const mapRef = useRef<MapCanvasHandle>(null);

  /**
   * Позиция нужна не только водителю на карте, но и серверу: подбор машин ищет их по
   * гео-множеству, куда попадают только приславшие координаты. Без этого водитель на
   * линии для диспетчеризации не существует и заказов не получает.
   */
  useLocationReporting(position, isOnline);

  /**
   * Карта подводится к машине один раз за выход на линию. Делать это на каждый GPS-тик
   * нельзя: водитель не смог бы отвести карту в сторону — её бы тут же возвращало назад.
   * Вернуться к себе он может кнопкой.
   */
  const centeredRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      centeredRef.current = false;
      return;
    }

    if (!position || centeredRef.current) {
      return;
    }

    centeredRef.current = true;
    mapRef.current?.centerOn(position, DRIVER_ZOOM_DELTA);
  }, [isOnline, position]);

  const centerOnDriver = () => {
    if (position) {
      mapRef.current?.centerOn(position, DRIVER_ZOOM_DELTA);
    }
  };

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
        {/*
          `initialPoint` срабатывает, только если позиция известна уже к первому рендеру
          (кэш прошлой смены). Обычно она приходит позже, когда камера внутри карты
          зафиксирована, — поэтому карту к машине подводит эффект через `mapRef`.
        */}
        <MapCanvas initialPoint={position} ref={mapRef} showsUserLocation />
      </View>

      {/*
        Верхний ряд: статус смены и профиль. Статус читается из самой «пилюли», поэтому
        отдельная точка-индикатор слева не нужна — вместо неё пустой слот той же ширины,
        чтобы «пилюля» осталась по центру экрана.
      */}
      <View
        style={[
          styles.topBar,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.sm,
          },
        ]}
      >
        {/*
          Слот держит «пилюлю» по центру и вне линии остаётся пустым: искать себя на карте
          есть смысл только на смене. Ширина слота фиксированная, поэтому появление кнопки
          не сдвигает «пилюлю».
        */}
        <View style={styles.topBarSlot}>
          {isOnline ? (
            <RoundButton
              accessibilityLabel="Показать, где я"
              onPress={centerOnDriver}
              variant="surface"
            >
              <SymbolView
                name={{ android: 'my_location', ios: 'location.fill', web: 'my_location' }}
                resizeMode="scaleAspectFit"
                size={22}
                tintColor={position ? theme.colors.primary : theme.colors.textMuted}
                type="monochrome"
                weight={{ android: medium, ios: 'medium' }}
              />
            </RoundButton>
          ) : null}
        </View>

        <View style={styles.topBarCenter}>
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
        </View>

        <View style={[styles.topBarSlot, styles.topBarSlotRight]}>
          <RoundButton
            accessibilityLabel={t('profile.title')}
            onPress={() => router.push('/(tabs)/profile')}
            variant="surface"
          >
            <SymbolView
              name={{ android: 'person', ios: 'person.fill', web: 'person' }}
              resizeMode="scaleAspectFit"
              size={22}
              tintColor={theme.colors.primary}
              type="monochrome"
              weight={{ android: medium, ios: 'medium' }}
            />
          </RoundButton>
        </View>
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

        {/*
          Состояние геопозиции показываем только на линии: вне смены она не нужна,
          и предупреждение выглядело бы придиркой на пустом месте.
        */}
        {isOnline && permissionState === 'denied' ? (
          <Pressable onPress={() => void (canAskAgain ? requestLocation() : openSettings())}>
            <Text tone="muted" variant="caption">
              {canAskAgain
                ? 'Нажмите, чтобы разрешить доступ к геопозиции и видеть себя на карте'
                : 'Доступ к геопозиции запрещён. Нажмите, чтобы открыть настройки'}
            </Text>
          </Pressable>
        ) : null}

        {isOnline && permissionState === 'granted' && !position && isLocating ? (
          <Text tone="muted" variant="caption">
            Определяем ваше положение…
          </Text>
        ) : null}

        {positionError ? (
          <Text tone="muted" variant="caption">
            {positionError}
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
  topBarCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  topBarSlot: {
    alignItems: 'flex-start',
    // Ширина круглой кнопки: держит «пилюлю» ровно по центру экрана.
    width: 44,
  },
  topBarSlotRight: {
    alignItems: 'flex-end',
  },
});
