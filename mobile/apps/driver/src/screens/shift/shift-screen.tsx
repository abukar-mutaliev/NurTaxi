/**
 * Рабочий экран смены (M8.1–M8.3): карта, переключатель линии и сводка за день.
 *
 * Источник истины по статусу — сервер (`PATCH /driver/status`). Локальный слайс `shift`
 * держит оптимистичное значение, чтобы переключатель не «залипал» при плохой связи,
 * а при отказе сервера возвращается назад.
 */
import { StatusBar } from 'expo-status-bar';
import { useIsFocused, useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveCurrentPosition } from '@nurtaxi/shared-core/features/geolocation';
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatMoney, formatRating } from '@nurtaxi/shared-core/shared/lib';
import { brandColors, shadows, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import {
  useGetDriverEarningsQuery,
  useGetDriverProfileQuery,
  useUpdateDriverStatusMutation,
} from '@nurtaxi/shared-core/entities/driver';
import { formatOrderStatusLabel } from '@nurtaxi/shared-core/entities/order';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useCurrentDriverOrder } from '@/features/current-order';
import { useDriverPosition } from '@/features/driver-position';
import { useDriverLocationTracking } from '@/features/location-tracking';
import { onlineIntentChanged, selectWantsOnline } from '@/processes/shift';
import { getGlassTabBarBottomInset } from '@/shared/constants/glass-tab-bar';
import { RoundButton } from '@/shared/ui/round-button';
import { StatTiles } from '@/shared/ui/stat-tiles';
import { MapCanvas, type MapCanvasHandle } from '@/widgets/map';

/**
 * Масштаб, на который встаёт карта, показав водителю его позицию: примерно квартал
 * вокруг машины. Обзорный масштаб здесь бесполезен — на нём не понять, где ты стоишь.
 */
const DRIVER_ZOOM_DELTA = 0.01;

/** Карточка растёт вверх, когда появляются подсказки, — без анимации переключатель прыгал. */
const SHEET_LAYOUT = LinearTransition.duration(220);
const HINT_ENTERING = FadeIn.duration(180);
const HINT_EXITING = FadeOut.duration(120);

/**
 * Заказы, которые экран уже открывал сам. Автопереход нужен один раз — при запуске на
 * принятом заказе; вернувшись с экрана заказа назад, водитель не должен улетать туда снова.
 */
const openedOrderIds = new Set<string>();

export function ShiftScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const wantsOnline = useAppSelector(selectWantsOnline);
  const { data: profile } = useGetDriverProfileQuery();
  const { data: earnings } = useGetDriverEarningsQuery();
  const [updateStatus] = useUpdateDriverStatusMutation();

  const [error, setError] = useState<string | null>(null);

  // Входящий заказ (M8.3) показывает `IncomingOrderOverlay` в корневом layout — над любым
  // экраном, а не только над этим.

  const { isBusy, order: currentOrder, isLoading: isCurrentOrderLoading } = useCurrentDriverOrder();
  const isFocused = useIsFocused();

  /**
   * Запуск на принятом заказе сразу ведёт на его экран. Если заказ нашёлся, пока этот экран
   * не на виду (водитель только что принял предложение и уже на экране заказа), просто
   * запоминаем его — иначе кнопка «Назад» возвращала бы на тот же заказ.
   */
  useEffect(() => {
    if (!currentOrder || openedOrderIds.has(currentOrder.id)) {
      return;
    }
    openedOrderIds.add(currentOrder.id);
    if (isFocused) {
      router.push(`/order/${currentOrder.id}`);
    }
  }, [currentOrder, isFocused, router]);

  const openCurrentOrder = () => {
    router.push(currentOrder ? `/order/${currentOrder.id}` : ('/(tabs)/orders' as Href));
  };

  const serverOnline = profile?.onlineStatus === 'online' || (wantsOnline && !profile);
  /**
   * Значение, к которому переключатель уже уехал, пока сервер не ответил. Без него `value`
   * оставался серверным: ползунок уезжал, отпрыгивал назад и после ответа ехал снова.
   */
  const [pendingOnline, setPendingOnline] = useState<boolean | null>(null);
  // Снимаем, как только подтверждённый статус догнал, — прямо при рендере, как в `SwitchRow`.
  if (pendingOnline !== null && pendingOnline === serverOnline) {
    setPendingOnline(null);
  }
  const isOnline = pendingOnline ?? serverOnline;
  const canGoOnline = profile?.canGoOnline ?? false;

  /**
   * Передача позиции на сервер. Источник истины — серверный статус: так трансляция
   * переживает перезапуск приложения посреди смены и не запускается по одному лишь
   * оптимистичному переключателю. Задача фоновая, поэтому координаты уходят и когда
   * водитель свернул приложение.
   */
  useDriverLocationTracking(profile?.onlineStatus === 'online');

  /**
   * Позиция для карты — отдельная забота: фоновая задача отправляет координаты серверу,
   * но экрану их не отдаёт, а водителю нужно видеть себя и уметь вернуть камеру к машине.
   */
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
  // Высота нижней карточки меняется (ошибки, подсказки геопозиции), поэтому кнопку
  // поднимаем над ней по замеру, а не по константе.
  const [sheetHeight, setSheetHeight] = useState(0);

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

  /**
   * Вне линии слежения нет и `position` пуст, поэтому берём разовую точку (кэш или
   * last known): кнопка нужна и до выхода на смену.
   */
  const centerOnDriver = async () => {
    const point = position ?? (await resolveCurrentPosition());
    if (point) {
      mapRef.current?.centerOn(point, DRIVER_ZOOM_DELTA);
    }
  };

  const toggleOnline = async (next: boolean) => {
    // Повторное нажатие до ответа сервера игнорируем: запросы не должны обгонять друг друга.
    if (pendingOnline !== null) {
      return;
    }
    setError(null);
    // Оптимистично двигаем переключатель, чтобы отклик был мгновенным.
    setPendingOnline(next);
    dispatch(onlineIntentChanged(next));
    try {
      const updated = await updateStatus({ status: next ? 'online' : 'offline' }).unwrap();
      // Сервер мог оставить другой статус (например, `busy`) — тогда ждать нечего.
      if ((updated.onlineStatus === 'online') !== next) {
        setPendingOnline(null);
      }
    } catch (cause) {
      setPendingOnline(null);
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
        {/* Пустой слот той же ширины, что и кнопка профиля справа, держит «пилюлю» по центру. */}
        <View style={styles.topBarSlot} />

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
            <Text variant="bodyStrong">
              {isBusy ? t('driver.onTrip') : isOnline ? 'Вы на линии' : 'Вы офлайн'}
            </Text>
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
        Кнопка «Показать, где я» — справа снизу, над нижней карточкой, в видимой части карты.
      */}
      <View
        pointerEvents="box-none"
        style={[styles.centerButton, { bottom: sheetHeight + theme.spacing.md }]}
      >
        <RoundButton
          accessibilityLabel="Показать, где я"
          onPress={() => void centerOnDriver()}
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
      </View>

      {/* Нижняя карточка: переключатель линии и сводка */}
      <Animated.View
        layout={SHEET_LAYOUT}
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
        style={[
          styles.sheet,
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
        {/*
          На заказе переключатель линии бесполезен — сервер не даёт менять статус до конца
          поездки. Вместо него — дорога к текущему заказу.
        */}
        {isBusy ? (
          <Pressable
            accessibilityRole="button"
            onPress={openCurrentOrder}
            style={({ pressed }) => [styles.switchRow, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
              <Text variant="bodyStrong">{t('driver.currentOrder')}</Text>
              <Text numberOfLines={1} tone="muted" variant="caption">
                {currentOrder
                  ? `${formatOrderStatusLabel(currentOrder.status)} · ${currentOrder.pickupAddress}`
                  : isCurrentOrderLoading
                    ? t('driver.currentOrderLoading')
                    : t('driver.currentOrderMissing')}
              </Text>
            </View>
            <View
              style={[
                styles.openOrderButton,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.lg,
                },
              ]}
            >
              <Text style={{ color: theme.colors.onPrimary }} variant="bodyStrong">
                {t('driver.openOrder')}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
              <Text variant="bodyStrong">
                {isOnline ? t('driver.goOffline') : t('driver.goOnline')}
              </Text>
              <Text tone="muted" variant="caption">
                {!canGoOnline
                  ? 'Выйти на линию можно после одобрения документов'
                  : isOnline
                    ? 'Нажмите, чтобы перестать принимать заказы'
                    : 'Нажмите, чтобы начать принимать заказы'}
              </Text>
            </View>
            {/*
            Не блокируем на время запроса: смена `disabled` перекрашивала переключатель
            посреди анимации. Повторные нажатия отсекает `toggleOnline`.
          */}
            <Switch
              disabled={!canGoOnline}
              ios_backgroundColor={theme.colors.surfaceMuted}
              onValueChange={toggleOnline}
              thumbColor={theme.colors.surface}
              trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primary }}
              value={isOnline}
            />
          </View>
        )}

        {error ? (
          <Animated.View entering={HINT_ENTERING} exiting={HINT_EXITING}>
            <Text tone="danger" variant="caption">
              {error}
            </Text>
          </Animated.View>
        ) : null}

        {/*
          Состояние геопозиции показываем только на линии: вне смены она не нужна,
          и предупреждение выглядело бы придиркой на пустом месте.
        */}
        {isOnline && permissionState === 'denied' ? (
          <Animated.View entering={HINT_ENTERING} exiting={HINT_EXITING}>
            <Pressable onPress={() => void (canAskAgain ? requestLocation() : openSettings())}>
              <Text tone="muted" variant="caption">
                {canAskAgain
                  ? 'Нажмите, чтобы разрешить доступ к геопозиции и видеть себя на карте'
                  : 'Доступ к геопозиции запрещён. Нажмите, чтобы открыть настройки'}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {isOnline && permissionState === 'granted' && !position && isLocating ? (
          <Animated.View entering={HINT_ENTERING} exiting={HINT_EXITING}>
            <Text tone="muted" variant="caption">
              Определяем ваше положение…
            </Text>
          </Animated.View>
        ) : null}

        {positionError ? (
          <Animated.View entering={HINT_ENTERING} exiting={HINT_EXITING}>
            <Text tone="muted" variant="caption">
              {positionError}
            </Text>
          </Animated.View>
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    position: 'absolute',
    right: 16,
    zIndex: 5,
  },
  openOrderButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  root: {
    backgroundColor: brandColors.background,
    flex: 1,
  },
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    ...shadows.up,
  },
  statusPill: {
    borderWidth: 1,
    elevation: 2,
    ...shadows.sm,
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
