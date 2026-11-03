/**
 * Главный экран клиента (M3.3): карта, поиск адреса, оформление заказа (Figma node 39:1106).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNearbyDrivers } from '@nurtaxi/shared-core/entities/geo';
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatCountdown, formatDistance, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { buildDrivingRoute } from '@nurtaxi/shared-core/shared/lib/yandex-geo';
import { OrderStatus, PaymentMethod, type GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { brandColors, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';
import {
  formatOrderStatusLabel,
  orderStage,
  useCreateOrderMutation,
  useGetOrderQuery,
  useWaitingClock,
} from '@nurtaxi/shared-core/entities/order';
import {
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';
import { useLiveOrderRoute } from '@nurtaxi/shared-core/features/navigation';
import { selectDriverPosition, useOrderRealtime } from '@nurtaxi/shared-core/features/realtime';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  decidePickupFromCamera,
  isAutoPickupLocation,
  shouldSyncAutoPickup,
  useOrderRegion,
  useResolveLocationForOrder,
  useResolvedLocationAddress,
  type AddressField,
} from '@/features/address';
import { useActiveOrderGuard, useOrderEstimate, OrderExtrasFields } from '@/features/order';
import {
  isRoadGeometry,
  roadFromPolyline,
  roadPolylineOrNull,
  useRoadRoute,
} from '@/features/route';
import {
  activeOrderChanged,
  canSubmitOrderExtras,
  childSeatChanged,
  commentChanged,
  draftStops,
  createOrderCompat,
  familyMemberSelected,
  orderDraftDiscarded,
  orderForOtherChanged,
  passengerNameChanged,
  passengerPhoneChanged,
  paymentMethodSelected,
  pickupSelected,
  selectActiveOrderId,
  selectOrderDraft,
  selectOrderStop,
  stopSelected,
} from '@/processes/order-flow';
import {
  MapCanvas,
  MapCenterButton,
  MapCenterPin,
  type MapCameraChange,
  type MapCanvasHandle,
  type MapMarker,
  resolveOrderMapMarkers,
} from '@/widgets/map';

import { HomeMapHeader } from './home-map-header';
import { HomeOrderSheet } from './home-order-sheet';
import { PaymentMethodSheet } from './payment-method-sheet';

import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';
import { glassShadow } from '@/shared/ui/glass-shadow';

/**
 * Длиннее этого маршрут почти наверняка собран из точки в чужом городе (в Торуне тоже есть
 * улица Юрия Гагарина) — предупреждаем, но заказ не запрещаем: дальние поездки бывают.
 */
const FAR_ROUTE_M = 500_000;

export function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const tabBarInset = useGlassTabBarInset();
  const mapRef = useRef<MapCanvasHandle>(null);

  useOrderRegion();
  const { hasActiveOrder, activeOrderId: guardedActiveId } = useActiveOrderGuard();

  const permission = useLocationPermission();
  const { position } = useCurrentPosition(permission.state === 'granted');

  /**
   * Без геопозиции на главной нет ни метки «я здесь», ни адреса подачи по умолчанию. Раньше
   * разрешение спрашивал только поиск адреса, и после установки карта оставалась «ничьей».
   * Спрашиваем один раз, когда проверка завершилась и решения ещё нет: отказ не повторяем.
   */
  const askedLocationRef = useRef(false);
  const { isChecking: isCheckingLocation, request: requestLocation } = permission;
  useEffect(() => {
    if (isCheckingLocation || permission.state !== 'undetermined' || askedLocationRef.current) {
      return;
    }
    askedLocationRef.current = true;
    void requestLocation();
  }, [isCheckingLocation, permission.state, requestLocation]);

  const draft = useAppSelector(selectOrderDraft);
  const { pickup, dropoff } = draft;
  const stop = useAppSelector(selectOrderStop);
  const activeOrderId = useAppSelector(selectActiveOrderId);
  const effectiveActiveId = guardedActiveId ?? activeOrderId;
  useOrderRealtime(hasActiveOrder ? effectiveActiveId : null);

  const { estimate, isEstimating, error: estimateError, stopNotPriced } = useOrderEstimate();
  const [createOrder, createState] = useCreateOrderMutation();
  const [createError, setCreateError] = useState<string | null>(null);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [orderSheetHeight, setOrderSheetHeight] = useState(0);
  const [isHomeFocused, setIsHomeFocused] = useState(true);
  /**
   * Маршрут уже построен, но пассажир двигает карту, чтобы переставить точку подачи.
   * Ключ «Куда» хранится вместе с режимом: смена точки назначения сама выключает подстройку,
   * без эффекта, который синхронно сбрасывал бы state.
   */
  const dropoffKey = dropoff ? `${dropoff.lat.toFixed(5)},${dropoff.lng.toFixed(5)}` : '';
  const [pickupAdjustKey, setPickupAdjustKey] = useState<string | null>(null);
  const adjustingPickup = pickupAdjustKey !== null && pickupAdjustKey === dropoffKey;

  const { data: activeOrder } = useGetOrderQuery(effectiveActiveId ?? '', {
    skip: !effectiveActiveId,
  });
  const waitingClock = useWaitingClock(
    activeOrder?.status === OrderStatus.DriverArrived ? activeOrder.waiting : null,
  );
  const driverPosition = useAppSelector(selectDriverPosition(effectiveActiveId ?? ''));
  const reportedDriverPoint =
    activeOrder?.driver?.lat != null && activeOrder.driver.lng != null
      ? { lat: activeOrder.driver.lat, lng: activeOrder.driver.lng }
      : null;
  const carPoint = driverPosition ?? reportedDriverPoint;
  const driverIsComing = activeOrder != null && orderStage(activeOrder.status) === 'waiting-driver';
  const liveRoute = useLiveOrderRoute({
    buildLocalRoute: buildDrivingRoute,
    dropoff: { lat: activeOrder?.dropoffLat ?? 0, lng: activeOrder?.dropoffLng ?? 0 },
    enabled: Boolean(
      activeOrder &&
      (orderStage(activeOrder.status) === 'waiting-driver' ||
        orderStage(activeOrder.status) === 'riding'),
    ),
    origin: carPoint,
    pickup: { lat: activeOrder?.pickupLat ?? 0, lng: activeOrder?.pickupLng ?? 0 },
    status: activeOrder?.status ?? '',
    stops: activeOrder?.stops,
  });

  const showOrderSheet = Boolean(pickup && dropoff && !hasActiveOrder);
  const bottomInset = tabBarInset;

  const myLocationLabel = t('addresses.myLocation');
  const resolvedPickupAddress = useResolvedLocationAddress(pickup, [myLocationLabel]);
  const resolvedDropoffAddress = useResolvedLocationAddress(dropoff, [myLocationLabel]);
  const resolveLocationForOrder = useResolveLocationForOrder(myLocationLabel);

  useEffect(() => {
    // Только видимый экран ведёт точку подачи. После закрытия заказа `replace('/(tabs)')`
    // может оставить под новым главным экраном старый: у каждого своя `position`, и если
    // они расходятся больше порога, экраны бесконечно переписывают `pickup` друг за другом
    // («Maximum update depth exceeded»).
    if (!isHomeFocused || !position || hasActiveOrder) {
      return;
    }

    const nextPickup = {
      lat: position.lat,
      lng: position.lng,
      address: myLocationLabel,
    };

    if (!pickup) {
      dispatch(pickupSelected(nextPickup));
      return;
    }

    if (!isAutoPickupLocation(pickup, myLocationLabel)) {
      return;
    }

    if (!shouldSyncAutoPickup(pickup, position)) {
      return;
    }

    dispatch(pickupSelected(nextPickup));
  }, [dispatch, hasActiveOrder, isHomeFocused, myLocationLabel, pickup, position]);

  /**
   * До «Куда» метка в центре карты и есть точка подачи: карту двигают, такси приедет туда.
   * Когда маршрут уже есть, тот же режим включается кнопкой — иначе осмотр пути сдвигал бы подачу.
   */
  const showPickupPin = !hasActiveOrder && (!dropoff || adjustingPickup);
  const followGpsPickupRef = useRef(true);
  const pickupRef = useRef(pickup);
  const positionRef = useRef(position);
  const dropoffRef = useRef(dropoff);
  const showPickupPinRef = useRef(showPickupPin);
  useEffect(() => {
    pickupRef.current = pickup;
    positionRef.current = position;
    dropoffRef.current = dropoff;
    showPickupPinRef.current = showPickupPin;
  }, [dropoff, pickup, position, showPickupPin]);

  const onPickupCameraChange = useCallback(
    (change: MapCameraChange) => {
      if (!showPickupPinRef.current || change.reason !== 'gestures') {
        return;
      }

      if (!change.finished) {
        followGpsPickupRef.current = false;
        return;
      }

      const decision = decidePickupFromCamera({
        current: pickupRef.current,
        finished: true,
        mapPointAddress: t('addresses.mapPoint', {
          lat: change.point.lat.toFixed(5),
          lng: change.point.lng.toFixed(5),
        }),
        myLocationLabel,
        next: change.point,
      });
      followGpsPickupRef.current = decision.followGps;
      if (decision.pickup) {
        dispatch(pickupSelected(decision.pickup));
        return;
      }

      if (decision.followGps && !dropoffRef.current && positionRef.current) {
        mapRef.current?.centerOn(positionRef.current, 0.008);
      }
    },
    [dispatch, myLocationLabel, t],
  );

  const beginPickupAdjust = () => {
    if (!pickupRef.current || hasActiveOrder) {
      return;
    }
    followGpsPickupRef.current = false;
    setPickupAdjustKey(dropoffKey);
  };

  const nearbyCenter = pickup ?? (position ? { lat: position.lat, lng: position.lng } : null);
  const nearbyDrivers = useNearbyDrivers({
    enabled: isHomeFocused && !driverIsComing,
    point: nearbyCenter,
    regionId: draft.regionId,
  });

  const markers = useMemo((): MapMarker[] => {
    if (activeOrder) {
      return resolveOrderMapMarkers({
        assignedDriverId: activeOrder.driver?.id,
        driver: carPoint,
        dropoff: {
          address: activeOrder.dropoffAddress,
          lat: activeOrder.dropoffLat,
          lng: activeOrder.dropoffLng,
        },
        nearbyDrivers,
        pickup: {
          address: activeOrder.pickupAddress,
          lat: activeOrder.pickupLat,
          lng: activeOrder.pickupLng,
        },
        routePolyline: activeOrder.route?.polyline,
        stops: activeOrder.stops,
      });
    }

    return resolveOrderMapMarkers({
      dropoff,
      nearbyDrivers,
      pickup,
      routePolyline: estimate?.route.polyline,
      stops: stop ? [stop] : null,
    });
  }, [activeOrder, carPoint, dropoff, estimate?.route.polyline, nearbyDrivers, pickup, stop]);

  const tripWaypoints = useMemo((): GeoPoint[] | null => {
    if (activeOrder) {
      return [
        { lat: activeOrder.pickupLat, lng: activeOrder.pickupLng },
        ...(activeOrder.stops ?? []),
        { lat: activeOrder.dropoffLat, lng: activeOrder.dropoffLng },
      ];
    }
    if (pickup && dropoff) {
      return stop ? [pickup, stop, dropoff] : [pickup, dropoff];
    }
    return null;
  }, [activeOrder, dropoff, pickup, stop]);
  const driverRoad = roadFromPolyline(driverPosition?.route);
  const liveRoad = isRoadGeometry(liveRoute.points) ? liveRoute.points : null;
  const tripRoad = useRoadRoute(liveRoad || driverIsComing ? null : tripWaypoints);
  const approachLat = carPoint ? Math.round(carPoint.lat * 1_000) / 1_000 : null;
  const approachLng = carPoint ? Math.round(carPoint.lng * 1_000) / 1_000 : null;
  const approachFallback = useMemo((): GeoPoint[] | null => {
    if (!driverIsComing || approachLat == null || approachLng == null || !activeOrder) {
      return null;
    }
    return [
      { lat: approachLat, lng: approachLng },
      { lat: activeOrder.pickupLat, lng: activeOrder.pickupLng },
    ];
  }, [activeOrder, approachLat, approachLng, driverIsComing]);
  const routePoints = driverIsComing
    ? (driverRoad ?? liveRoad ?? approachFallback)
    : (liveRoad ?? tripRoad);
  const routePolyline = routePoints
    ? null
    : roadPolylineOrNull(activeOrder?.route?.polyline ?? estimate?.route.polyline);

  const markersRef = useRef(markers);
  const routePolylineRef = useRef(routePolyline);
  const routePointsRef = useRef(routePoints);

  useEffect(() => {
    markersRef.current = markers;
    routePolylineRef.current = routePolyline;
    routePointsRef.current = routePoints;
  }, [markers, routePolyline, routePoints]);

  const [frozenMapState, setFrozenMapState] = useState({
    markers,
    routePoints,
    routePolyline,
  });
  useFocusEffect(
    useCallback(() => {
      setIsHomeFocused(true);
      return () => {
        setFrozenMapState({
          markers: markersRef.current,
          routePoints: routePointsRef.current,
          routePolyline: routePolylineRef.current,
        });
        setIsHomeFocused(false);
      };
    }, []),
  );

  const mapMarkers = isHomeFocused
    ? showPickupPin
      ? markers.filter((marker) => marker.kind !== 'pickup')
      : markers
    : frozenMapState.markers;
  const mapPolyline = isHomeFocused ? routePolyline : frozenMapState.routePolyline;
  const mapRoutePoints = isHomeFocused ? routePoints : frozenMapState.routePoints;

  useEffect(() => {
    if (!isHomeFocused || showPickupPin) {
      return;
    }

    if (activeOrder?.id || (pickup && dropoff)) {
      mapRef.current?.fitToRoute();
    }
  }, [
    activeOrder?.id,
    dropoff,
    estimate?.route.polyline,
    isHomeFocused,
    pickup,
    routePoints,
    showPickupPin,
    stop,
  ]);

  useEffect(() => {
    // Пока пассажир не схватил карту, метка стоит на уже выбранной подаче,
    // а если её не выбирали — на GPS.
    if (!isHomeFocused || !showPickupPin || dropoff || !followGpsPickupRef.current) {
      return;
    }
    const pickupNow = pickupRef.current;
    const target =
      pickupNow && !isAutoPickupLocation(pickupNow, myLocationLabel) ? pickupNow : position;
    if (!target) {
      return;
    }
    mapRef.current?.centerOn(target, 0.008);
  }, [dropoff, isHomeFocused, myLocationLabel, pickup, position, showPickupPin]);

  useEffect(() => {
    if (!adjustingPickup) {
      return;
    }
    const point = pickupRef.current;
    if (!point) {
      return;
    }
    const center = () => mapRef.current?.centerOn(point, 0.006);
    center();
    const retry = setTimeout(center, 350);
    return () => clearTimeout(retry);
  }, [adjustingPickup]);

  const centerOnMyLocation = () => {
    // Без разрешения кнопка не должна молчать: спрашиваем, а после отказа навсегда — в настройки.
    if (permission.state !== 'granted') {
      void (permission.canAskAgain ? permission.request() : permission.openSettings());
      return;
    }
    if (!position) {
      return;
    }
    if (showPickupPin) {
      followGpsPickupRef.current = true;
      dispatch(
        pickupSelected({
          lat: position.lat,
          lng: position.lng,
          address: myLocationLabel,
        }),
      );
      if (dropoff) {
        setPickupAdjustKey(null);
      }
    }
    mapRef.current?.centerOn(position, showPickupPin ? 0.008 : 0.01);
  };

  const openSearch = (field: AddressField = 'dropoff') => {
    if (hasActiveOrder && effectiveActiveId) {
      router.push(`/order/${effectiveActiveId}`);
      return;
    }
    router.push({ pathname: '/address/search', params: { field } });
  };

  const submitOrder = async () => {
    if (
      !draft.regionId ||
      !draft.pickup ||
      !draft.dropoff ||
      !estimate ||
      !canSubmitOrderExtras(draft)
    ) {
      return;
    }
    setCreateError(null);
    const base = {
      regionId: draft.regionId,
      pickup: await resolveLocationForOrder(draft.pickup),
      dropoff: await resolveLocationForOrder(draft.dropoff),
      tariffId: draft.tariffId ?? undefined,
      paymentMethod: draft.paymentMethod,
    };
    try {
      const order = await createOrderCompat(
        (payload) => createOrder(payload).unwrap(),
        base,
        draft,
        draftStops(stop),
      );
      dispatch(activeOrderChanged(order.id));
      router.push(`/order/${order.id}`);
    } catch (cause) {
      const appError = toAppError(cause as never);
      if (appError.code === 'ACTIVE_ORDER_EXISTS') {
        const details = appError.details as { orderId?: string } | undefined;
        if (details?.orderId) {
          dispatch(activeOrderChanged(details.orderId));
          router.replace(`/order/${details.orderId}`);
          return;
        }
      }
      setCreateError(appError.message);
    }
  };

  /**
   * Отказ от заказа до его создания. Раньше выйти из оформления было нельзя: лист держался,
   * пока выбраны оба адреса, а стереть адрес назначения было негде. Точка подачи «моё
   * местоположение» вернётся сама — её подставляет эффект выше.
   */
  const discardOrderDraft = useCallback(() => {
    setCreateError(null);
    setPaymentSheetVisible(false);
    dispatch(orderDraftDiscarded());
  }, [dispatch]);

  // Системная «Назад» на Android при открытом листе отменяет оформление, а не сворачивает
  // приложение с недооформленным заказом.
  const canDiscardByBack = showOrderSheet && !createState.isLoading;
  useFocusEffect(
    useCallback(() => {
      if (!canDiscardByBack) {
        return undefined;
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        discardOrderDraft();
        return true;
      });
      return () => subscription.remove();
    }, [canDiscardByBack, discardOrderDraft]),
  );

  const openPaymentMethods = () => {
    setPaymentSheetVisible(true);
  };

  const paymentLabel =
    draft.paymentMethod === PaymentMethod.Card ? t('payment.cardMasked') : t('payment.cash');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View
        style={[
          styles.mapLayer,
          showPickupPin && isHomeFocused
            ? {
                marginBottom:
                  showOrderSheet && orderSheetHeight > 0 ? orderSheetHeight : tabBarInset,
              }
            : null,
        ]}
      >
        <MapCanvas
          autoFit={!showPickupPin}
          initialPoint={
            showPickupPin && pickup && !isAutoPickupLocation(pickup, myLocationLabel)
              ? pickup
              : position
          }
          markers={mapMarkers}
          onCameraChange={isHomeFocused && showPickupPin ? onPickupCameraChange : undefined}
          onMarkerPress={
            hasActiveOrder
              ? undefined
              : (marker) => {
                  if (marker.kind === 'pickup') {
                    beginPickupAdjust();
                  }
                }
          }
          ref={mapRef}
          routePoints={mapRoutePoints}
          routePolyline={mapPolyline}
          // Метка «я здесь», как у водителя. Без разрешения слою MapKit нечего показать.
          showsUserLocation={permission.state === 'granted'}
        />
        {isHomeFocused && showPickupPin ? <MapCenterPin /> : null}
      </View>

      <HomeMapHeader
        onMenuPress={() => router.push('/notifications')}
        onSearchPress={() => openSearch('dropoff')}
        searchLabel={hasActiveOrder ? t('order.goToActive') : t('order.where')}
      />

      {isHomeFocused && showPickupPin ? (
        <View
          pointerEvents="none"
          style={[
            styles.pickupHint,
            { top: insets.top + (permission.state === 'denied' && !showOrderSheet ? 128 : 64) },
          ]}
        >
          <Text style={styles.pickupHintText}>{t('addresses.movePickupHint')}</Text>
        </View>
      ) : null}

      {isHomeFocused && showOrderSheet ? (
        <Pressable
          onPress={showPickupPin ? () => setPickupAdjustKey(null) : beginPickupAdjust}
          style={[
            styles.pickupAdjustButton,
            { bottom: Math.max(orderSheetHeight, bottomInset) + 12 },
          ]}
        >
          <Text style={styles.pickupAdjustText}>
            {showPickupPin ? t('addresses.movePickupDone') : t('addresses.changePickup')}
          </Text>
        </Pressable>
      ) : null}

      {activeOrder ? (
        <Pressable
          onPress={() => router.push(`/order/${activeOrder.id}`)}
          style={[styles.activeOrderBanner, { top: insets.top + 68 }]}
        >
          <View style={styles.activeOrderCard}>
            <Text style={styles.activeOrderTitle}>
              {formatOrderStatusLabel(activeOrder.status)}
            </Text>
            <Text numberOfLines={waitingClock ? 2 : 1} style={styles.activeOrderSubtitle}>
              {waitingClock
                ? waitingClock.phase === 'free'
                  ? t('waiting.freeLeft', { time: formatCountdown(waitingClock.clockSeconds) })
                  : t('waiting.paidRate', {
                      price: formatMoney(waitingClock.pricePerMinute),
                      amount: formatMoney(waitingClock.amount),
                    })
                : activeOrder.dropoffAddress}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {permission.state === 'denied' && !showOrderSheet ? (
        <View style={[styles.permissionBanner, { top: insets.top + 68 }]}>
          <Text style={styles.permissionText}>{t('permissions.locationDenied')}</Text>
        </View>
      ) : null}

      {showOrderSheet ? (
        <HomeOrderSheet
          bottomInset={bottomInset}
          canOrder={Boolean(estimate && !isEstimating && canSubmitOrderExtras(draft))}
          onLayout={(event) => setOrderSheetHeight(event.nativeEvent.layout.height)}
          dropoffAddress={resolvedDropoffAddress ?? dropoff!.address ?? t('common.notSpecified')}
          error={
            createError ??
            estimateError?.message ??
            (!canSubmitOrderExtras(draft) ? t('order.orderForOtherInvalid') : null) ??
            (estimate && estimate.route.distanceM > FAR_ROUTE_M
              ? t('order.farRouteWarning', { distance: formatDistance(estimate.route.distanceM) })
              : null)
          }
          notice={stopNotPriced ? t('order.stopNotPriced') : null}
          estimate={estimate}
          extras={
            <OrderExtrasFields
              childSeat={draft.childSeat}
              comment={draft.comment}
              familyMemberId={draft.familyMemberId}
              onChildSeatChange={(value) => dispatch(childSeatChanged(value))}
              onCommentChange={(value) => dispatch(commentChanged(value))}
              onFamilyMemberSelect={(id, passenger) => {
                if (id) {
                  dispatch(passengerNameChanged(passenger.name));
                  dispatch(passengerPhoneChanged(passenger.phone));
                }
                dispatch(familyMemberSelected(id));
              }}
              onOrderForOtherChange={(value) => dispatch(orderForOtherChanged(value))}
              onPassengerNameChange={(value) => {
                dispatch(passengerNameChanged(value));
                dispatch(familyMemberSelected(null));
              }}
              onPassengerPhoneChange={(value) => {
                dispatch(passengerPhoneChanged(value));
                dispatch(familyMemberSelected(null));
              }}
              orderForOther={draft.orderForOther}
              passengerName={draft.passengerName}
              passengerPhone={draft.passengerPhone}
              regionId={draft.regionId}
              variant="sheet"
            />
          }
          fromLabel={t('order.from')}
          isEstimating={isEstimating}
          isOrdering={createState.isLoading}
          loadingLabel={t('common.loading')}
          addStopLabel={t('order.addStop')}
          onCancel={discardOrderDraft}
          onDropoffPress={() => openSearch('dropoff')}
          onOrder={submitOrder}
          onPaymentPress={openPaymentMethods}
          onPickupPress={() => openSearch('pickup')}
          onRemoveStop={() => dispatch(stopSelected(null))}
          onStopPress={() => openSearch('stop')}
          removeStopLabel={t('order.removeStop')}
          stopAddress={stop?.address ?? null}
          stopLabel={t('order.stop')}
          onTariffPress={() => undefined}
          orderLabel={t('order.createNur')}
          cancelLabel={t('order.cancelShort')}
          paymentLabel={paymentLabel}
          paymentMethod={draft.paymentMethod}
          paymentMethodLabel={t('order.paymentMethod')}
          pickupAddress={resolvedPickupAddress ?? pickup!.address ?? t('common.notSpecified')}
          priceFromLabel={(price) => t('order.priceFrom', { price })}
          selectedTariffId={draft.tariffId}
          toLabel={t('order.to')}
        />
      ) : null}

      <MapCenterButton
        bottomInset={showOrderSheet && orderSheetHeight > 0 ? orderSheetHeight : bottomInset}
        // Без разрешения кнопка активна — по нажатию оно и запрашивается.
        disabled={permission.state === 'granted' && !position}
        onPress={centerOnMyLocation}
      />

      <PaymentMethodSheet
        onClose={() => setPaymentSheetVisible(false)}
        onSelect={(method) => dispatch(paymentMethodSelected(method))}
        selectedMethod={draft.paymentMethod}
        visible={paymentSheetVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  activeOrderBanner: {
    left: 16,
    position: 'absolute',
    right: 16,
  },
  activeOrderCard: {
    backgroundColor: brandColors.surface,
    borderColor: brandColors.divider,
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...glassShadow({ color: brandColors.shadow }),
  },
  activeOrderSubtitle: {
    color: brandColors.textMuted,
    fontSize: typeScale.sm,
  },
  activeOrderTitle: {
    color: brandColors.text,
    fontSize: typeScale.md,
    fontWeight: '600',
  },
  permissionBanner: {
    backgroundColor: brandColors.surface,
    borderRadius: radius.lg,
    left: 16,
    padding: 12,
    position: 'absolute',
    right: 16,
  },
  permissionText: {
    color: brandColors.text,
    fontSize: typeScale.sm,
    textAlign: 'center',
  },
  root: {
    backgroundColor: brandColors.background,
    flex: 1,
  },
  mapLayer: {
    flex: 1,
  },
  pickupAdjustButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    left: 16,
    maxWidth: '70%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 4,
    position: 'absolute',
    zIndex: 6,
    ...glassShadow({ color: 'rgba(89,71,31,0.08)' }),
  },
  pickupAdjustText: {
    color: '#2E2331',
    fontSize: 14,
    fontWeight: '600',
  },
  pickupHint: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    right: 72,
  },
  pickupHintText: {
    color: '#2E2331',
    fontSize: 13,
    textAlign: 'center',
  },
});
