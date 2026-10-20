/**
 * Экран поездки (M4.5–M4.10, M5.2–M5.3): стадии заказа, карта, отмена, SOS.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useNearbyDrivers } from '@nurtaxi/shared-core/entities/geo';
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import {
  formatDistance,
  formatDuration,
  formatMoney,
  formatPrice,
  applyPhoneMask,
} from '@nurtaxi/shared-core/shared/lib';
import { buildDrivingRoute } from '@nurtaxi/shared-core/shared/lib/yandex-geo';
import { OrderStatus, ReviewTarget, type GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { Badge, Button, Input, Screen, Sheet, Text } from '@nurtaxi/shared-core/shared/ui';
import {
  isCancellableByClient,
  isSosAllowed,
  isTerminalOrder,
  orderApi,
  formatOrderStatusLabel,
  orderStage,
  orderStatusTone,
  useActivateSosMutation,
  useCancelOrderMutation,
  useGetOrderHistoryQuery,
  useGetOrderQuery,
} from '@nurtaxi/shared-core/entities/order';
import {
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';
import { contactByPhone } from '@nurtaxi/shared-core/features/contact';
import { useLiveOrderRoute } from '@nurtaxi/shared-core/features/navigation';
import {
  selectDriverPosition,
  selectIsRealtimeOnline,
  useOrderRealtime,
} from '@nurtaxi/shared-core/features/realtime';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  isRoadGeometry,
  roadFromPolyline,
  roadPolylineOrNull,
  useRoadRoute,
} from '@/features/route';
import { ReviewSheet } from '@/features/review';
import {
  activeOrderChanged,
  childSeatChanged,
  commentChanged,
  dropoffSelected,
  familyMemberSelected,
  orderDraftCleared,
  orderForOtherChanged,
  passengerNameChanged,
  passengerPhoneChanged,
  paymentMethodSelected,
  pickupSelected,
  regionSelected,
  stopSelected,
  tariffSelected,
} from '@/processes/order-flow';
import {
  GLASS_COLORS,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenHeader,
  GlassScreenShell,
  CollapsibleSheet,
} from '@/shared/ui';
import { MapCanvas, type MapCanvasHandle, resolveOrderMapMarkers } from '@/widgets/map';

import { DriverSearchOverlay } from './driver-search-overlay';
import { DriverEnRouteOverlay } from './driver-en-route-overlay';
import { TripInProgressOverlay } from './trip-in-progress-overlay';
import { useOrderTopInset } from './use-order-top-inset';

export function OrderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { id: orderId } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapCanvasHandle>(null);

  const isOnline = useAppSelector(selectIsRealtimeOnline);
  const driverPosition = useAppSelector(selectDriverPosition(orderId ?? ''));
  const permission = useLocationPermission();
  const { position } = useCurrentPosition(permission.state === 'granted');
  const headerTopInset = useOrderTopInset();
  const cachedStatus = useAppSelector(orderApi.endpoints.getOrder.select(orderId ?? '')).data
    ?.status;
  const stillSearching =
    cachedStatus == null ||
    cachedStatus === OrderStatus.Created ||
    cachedStatus === OrderStatus.SearchingDriver;
  const followDriver =
    cachedStatus === OrderStatus.DriverAssigned ||
    cachedStatus === OrderStatus.DriverEnRoute ||
    cachedStatus === OrderStatus.DriverArrived ||
    cachedStatus === OrderStatus.InProgress;

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetOrderQuery(orderId ?? '', {
    skip: !orderId,
    // Пока ищем водителя или он уже едет, опрос нужен даже при «живом» сокете:
    // событие о назначении и точку машины легко потерять, когда приложение водителя в фоне.
    pollingInterval: isOnline && !stillSearching && !followDriver ? 0 : 5000,
  });

  useOrderRealtime(orderId ?? null);

  useEffect(() => {
    if (!orderId || !isOnline) {
      return;
    }
    void refetch();
  }, [isOnline, orderId, refetch]);

  const [cancelOrder, cancelState] = useCancelOrderMutation();
  const [activateSos, sosState] = useActivateSosMutation();

  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [sosActivated, setSosActivated] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);

  const { data: history } = useGetOrderHistoryQuery({ limit: 20 });
  const historyItem = useMemo(
    () => history?.find((item) => item.order.id === orderId),
    [history, orderId],
  );
  const hasReview = historyItem?.reviews.some((r) => r.target === ReviewTarget.Driver) ?? false;

  useEffect(() => {
    if (order && isTerminalOrder(order.status)) {
      dispatch(activeOrderChanged(null));
    }
  }, [dispatch, order]);

  const nearbyDrivers = useNearbyDrivers({
    enabled: order != null && orderStage(order.status) !== 'waiting-driver',
    point: position ?? (order ? { lat: order.pickupLat, lng: order.pickupLng } : null),
    regionId: order?.regionId,
  });

  const reportedDriverPoint =
    order?.driver?.lat != null && order.driver.lng != null
      ? { lat: order.driver.lat, lng: order.driver.lng }
      : null;
  const carPoint = driverPosition ?? reportedDriverPoint;
  const driverIsComing = order != null && orderStage(order.status) === 'waiting-driver';

  const markers = useMemo(
    () =>
      order
        ? resolveOrderMapMarkers({
            assignedDriverId: order.driver?.id,
            driver: carPoint,
            dropoff: {
              address: order.dropoffAddress,
              lat: order.dropoffLat,
              lng: order.dropoffLng,
            },
            nearbyDrivers,
            pickup: {
              address: order.pickupAddress,
              lat: order.pickupLat,
              lng: order.pickupLng,
            },
            routePolyline: order.route?.polyline,
            stops: order.stops,
          })
        : [],
    [carPoint, nearbyDrivers, order],
  );

  const liveRoute = useLiveOrderRoute({
    buildLocalRoute: buildDrivingRoute,
    dropoff: { lat: order?.dropoffLat ?? 0, lng: order?.dropoffLng ?? 0 },
    enabled: Boolean(
      order &&
      (orderStage(order.status) === 'waiting-driver' || orderStage(order.status) === 'riding'),
    ),
    // Сокет точнее, но пока его нет — берём последнюю точку из заказа, а не заглушку «7 мин».
    origin: carPoint,
    pickup: { lat: order?.pickupLat ?? 0, lng: order?.pickupLng ?? 0 },
    status: order?.status ?? '',
    stops: order?.stops,
  });
  const etaLabel =
    liveRoute.leg === 'to-pickup' ? driverPosition?.eta || liveRoute.duration || null : null;
  const tripWaypoints = useMemo((): GeoPoint[] | null => {
    if (!order) {
      return null;
    }
    return [
      { lat: order.pickupLat, lng: order.pickupLng },
      ...(order.stops ?? []),
      { lat: order.dropoffLat, lng: order.dropoffLng },
    ];
  }, [order]);
  const driverRoad = roadFromPolyline(driverPosition?.route);
  const liveRoad = isRoadGeometry(liveRoute.points) ? liveRoute.points : null;
  const tripRoad = useRoadRoute(liveRoad || driverIsComing ? null : tripWaypoints);
  // Пока машина едет на подачу, кадр — путь к клиенту, а не поездка А→Б:
  // иначе камера обрезает водителя за краем маршрута заказа. Точку машины
  // округляем, чтобы каждый GPS-тик не пересобирал кадр.
  const approachLat = carPoint ? Math.round(carPoint.lat * 1_000) / 1_000 : null;
  const approachLng = carPoint ? Math.round(carPoint.lng * 1_000) / 1_000 : null;
  const approachFallback = useMemo((): GeoPoint[] | null => {
    if (!driverIsComing || approachLat == null || approachLng == null || !order) {
      return null;
    }
    return [
      { lat: approachLat, lng: approachLng },
      { lat: order.pickupLat, lng: order.pickupLng },
    ];
  }, [approachLat, approachLng, driverIsComing, order]);
  const routePoints = driverIsComing
    ? (driverRoad ?? liveRoad ?? approachFallback)
    : (liveRoad ?? tripRoad);
  const routePolyline = routePoints ? null : roadPolylineOrNull(order?.route?.polyline);

  useEffect(() => {
    if (!order?.id) {
      return;
    }
    mapRef.current?.fitToRoute();
  }, [liveRoute.leg, order?.id, order?.status, routePoints]);

  if (!orderId) {
    return (
      <GlassScreenShell title={t('order.tripTitle')}>
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

  const stage = orderStage(order.status);
  const noDrivers = order.status === OrderStatus.CancelledSystem;
  const showDriverSearch = stage === 'searching';
  const showDriverEnRoute = stage === 'waiting-driver' && Boolean(order.driver) && !noDrivers;
  const showTripInProgress = stage === 'riding';
  const showLegacyPanel = !showDriverSearch && !showDriverEnRoute && !showTripInProgress;

  const confirmCancel = async () => {
    try {
      await cancelOrder({ orderId, reason: cancelReason.trim() || undefined }).unwrap();
      setCancelVisible(false);
      dispatch(orderDraftCleared());
      dispatch(activeOrderChanged(null));
      router.replace('/(tabs)');
    } catch (cause) {
      Alert.alert(t('errors.title'), toAppError(cause as never).message);
    }
  };

  const contactDriver = () => {
    contactByPhone(order.driver?.phone, {
      title: t('contact.driver'),
      call: t('contact.call'),
      sms: t('contact.sms'),
      cancel: t('common.cancel'),
      unavailable: t('contact.unavailable'),
    });
  };

  const triggerSos = () => {
    Alert.alert(t('sos.title'), t('sos.description'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sos.confirm'),
        style: 'destructive',
        onPress: () => {
          void activateSos({
            orderId,
            lat: driverPosition?.lat ?? order.pickupLat,
            lng: driverPosition?.lng ?? order.pickupLng,
            address: order.pickupAddress,
          })
            .unwrap()
            .then((response) => {
              setSosActivated(true);
              Alert.alert(
                t('sos.activated'),
                t('sos.contactsNotified', { count: response.contactsNotified }),
              );
            })
            .catch((cause) => {
              Alert.alert(t('errors.title'), toAppError(cause as never).message);
            });
        },
      },
    ]);
  };

  const leaveToHome = () => {
    if (!order || isTerminalOrder(order.status)) {
      dispatch(orderDraftCleared());
      dispatch(activeOrderChanged(null));
    }
    router.replace('/(tabs)');
  };

  const centerOnMyLocation = () => {
    if (!position) {
      return;
    }
    mapRef.current?.centerOn(position, 0.01);
  };

  const retryOrder = () => {
    dispatch(regionSelected(order.regionId));
    dispatch(
      pickupSelected({
        lat: order.pickupLat,
        lng: order.pickupLng,
        address: order.pickupAddress,
      }),
    );
    dispatch(
      dropoffSelected({
        lat: order.dropoffLat,
        lng: order.dropoffLng,
        address: order.dropoffAddress,
      }),
    );
    dispatch(stopSelected(order.stops?.[0] ?? null));
    dispatch(paymentMethodSelected(order.paymentMethod));
    dispatch(commentChanged(order.comment ?? ''));
    dispatch(childSeatChanged(order.childSeat));
    dispatch(orderForOtherChanged(Boolean(order.passengerName || order.passengerPhone)));
    dispatch(passengerNameChanged(order.passengerName ?? ''));
    dispatch(
      passengerPhoneChanged(order.passengerPhone ? applyPhoneMask(order.passengerPhone) : ''),
    );
    dispatch(familyMemberSelected(order.familyMemberId));
    if (order.tariff?.id) {
      dispatch(tariffSelected(order.tariff.id));
    }
    dispatch(activeOrderChanged(null));
    router.replace('/(tabs)');
  };

  const shareTrip = async () => {
    try {
      await Share.share({
        message: t('order.shareMessage', {
          pickup: order.pickupAddress,
          dropoff: order.dropoffAddress,
        }),
      });
    } catch {
      // пользователь закрыл системный sheet
    }
  };

  // А→Б — снимок маршрута заказа. Живой участок от машины сюда не подставляем:
  // у водителя в карточке те же цифры, и они не должны сжиматься по ходу поездки.
  const tripDuration = order.route?.durationS ? formatDuration(order.route.durationS) : '—';
  const tripDistance = order.route?.distanceM ? formatDistance(order.route.distanceM) : '—';
  const tripPrice = formatPrice(order.priceFinal ?? order.priceEstimated, 'RUB');

  return (
    <>
      <Screen avoidKeyboard={false} edgeToEdge safeBottom={false} scroll={false}>
        <View style={styles.root}>
          <MapCanvas
            initialPoint={{
              lat: driverPosition?.lat ?? order.pickupLat,
              lng: driverPosition?.lng ?? order.pickupLng,
            }}
            markers={markers}
            ref={mapRef}
            routePoints={routePoints}
            routePolyline={routePolyline}
            // В пути клиент сидит в машине — его метка легла бы поверх метки водителя.
            showsUserLocation={permission.state === 'granted' && !showTripInProgress}
          />

          {showDriverSearch ? (
            <DriverSearchOverlay
              cancelLabel={t('order.cancelShort')}
              onBack={leaveToHome}
              onCancel={() => setCancelVisible(true)}
              subtitleLine1={t('order.searchingSubtitle1')}
              subtitleLine2={t('order.searchingSubtitle2')}
              titleLine1={t('order.searchingTitle1')}
              titleLine2={t('order.searchingTitle2')}
            />
          ) : null}

          {showDriverEnRoute && order.driver ? (
            <DriverEnRouteOverlay
              cancelLabel={t('order.cancelAction')}
              contactLabel={t('contact.driver')}
              driver={order.driver}
              etaLabel={etaLabel}
              femaleDriverSubtitle={t('order.femaleDriverSubtitle')}
              femaleDriverTitle={t('order.femaleDriverTitle')}
              onCancel={() => setCancelVisible(true)}
              onContact={contactDriver}
              onMenuPress={leaveToHome}
              onProfilePress={centerOnMyLocation}
              statusLabel={formatOrderStatusLabel(order.status)}
            />
          ) : null}

          {showTripInProgress ? (
            <TripInProgressOverlay
              cancelLabel={t('order.cancelTrip')}
              canCancel={isCancellableByClient(order.status)}
              contactLabel={t('contact.driver')}
              contactShortLabel={t('contact.driverShort')}
              driver={order.driver}
              distanceLabel={t('order.distance')}
              distanceValue={tripDistance}
              dropoffAddress={order.dropoffAddress}
              durationLabel={t('order.duration')}
              durationValue={tripDuration}
              onBack={leaveToHome}
              onCancel={() => setCancelVisible(true)}
              onContact={contactDriver}
              onProfilePress={centerOnMyLocation}
              onShare={shareTrip}
              onSos={isSosAllowed(order.status) ? triggerSos : undefined}
              pickupAddress={order.pickupAddress}
              stopAddresses={(order.stops ?? []).map((stop) => stop.address)}
              priceLabel={t('order.price')}
              priceValue={tripPrice}
              shareLabel={t('order.shareTrip')}
              sosLabel={t('sos.button')}
              title={t('order.tripTitle')}
            />
          ) : null}

          {showLegacyPanel ? (
            <>
              <View style={[styles.header, { paddingHorizontal: 16, paddingTop: headerTopInset }]}>
                <GlassScreenHeader onBack={leaveToHome} title={t('order.tripTitle')} />
              </View>

              <View style={[styles.panel, { padding: 16 }]}>
                <CollapsibleSheet variant="floating">
                  <View style={{ gap: 12 }}>
                    <GlassCard>
                      <View style={styles.statusRow}>
                        <Badge
                          label={formatOrderStatusLabel(order.status)}
                          tone={orderStatusTone(order.status)}
                        />
                        {!isOnline ? (
                          <View style={styles.reconnectingWrap}>
                            <GlassCaption style={styles.reconnectingCaption}>
                              {t('common.reconnecting')}
                            </GlassCaption>
                          </View>
                        ) : null}
                      </View>

                      {noDrivers ? (
                        <View style={styles.noDriversBlock}>
                          <Text style={styles.noDriversText}>{t('order.noDrivers')}</Text>
                          <GlassPrimaryButton
                            onPress={retryOrder}
                            title={t('order.tryAgain')}
                            variant="secondary"
                          />
                        </View>
                      ) : null}

                      {order.status === OrderStatus.FailedPayment ? (
                        <GlassCard tone="warning">
                          <Text
                            style={{ color: GLASS_COLORS.title, fontSize: 15, fontWeight: '600' }}
                          >
                            {t('payment.failed')}
                          </Text>
                          <GlassCaption>{t('payment.failedHint')}</GlassCaption>
                          <GlassPrimaryButton
                            onPress={refetch}
                            title={t('payment.retry')}
                            variant="secondary"
                          />
                        </GlassCard>
                      ) : null}

                      {stage === 'finishing' || order.status === OrderStatus.Closed ? (
                        <View style={{ gap: 4, paddingTop: 8 }}>
                          <Text style={{ color: GLASS_COLORS.title, fontSize: 15 }}>
                            {formatPrice(order.priceFinal ?? order.priceEstimated, 'RUB')}
                          </Text>
                          <GlassCaption>{order.dropoffAddress}</GlassCaption>
                        </View>
                      ) : null}

                      {order.childSeat ? <GlassCaption>{t('order.childSeat')}</GlassCaption> : null}
                      {order.passengerName ? (
                        <GlassCaption>
                          {t('driver.orderForOtherPassenger', { name: order.passengerName })}
                          {order.passengerPhone ? ` · ${order.passengerPhone}` : ''}
                        </GlassCaption>
                      ) : null}
                      {order.comment ? (
                        <GlassCaption>
                          {t('driver.clientComment')}: {order.comment}
                        </GlassCaption>
                      ) : null}
                    </GlassCard>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {isCancellableByClient(order.status) ? (
                        <View style={{ flex: 1 }}>
                          <GlassPrimaryButton
                            onPress={() => setCancelVisible(true)}
                            title={t('order.cancel')}
                            variant="secondary"
                          />
                        </View>
                      ) : null}
                      {isSosAllowed(order.status) ? (
                        <View style={{ flex: 1 }}>
                          <GlassPrimaryButton
                            disabled={sosActivated || sosState.isLoading}
                            loading={sosState.isLoading}
                            loadingTitle={t('common.loading')}
                            onPress={triggerSos}
                            title={t('sos.button')}
                          />
                        </View>
                      ) : null}
                    </View>

                    {order.status === OrderStatus.Closed ? (
                      <GlassPrimaryButton
                        onPress={() =>
                          router.push({ pathname: '/trip/[id]/receipt', params: { id: orderId } })
                        }
                        title={t('order.receipt')}
                        variant="secondary"
                      />
                    ) : null}

                    {(stage === 'finishing' || order.status === OrderStatus.Closed) &&
                    !hasReview ? (
                      <GlassPrimaryButton
                        onPress={() => setReviewVisible(true)}
                        title={t('review.title')}
                      />
                    ) : null}

                    {isTerminalOrder(order.status) && !noDrivers ? (
                      <GlassPrimaryButton onPress={leaveToHome} title={t('common.close')} />
                    ) : null}
                  </View>
                </CollapsibleSheet>
              </View>
            </>
          ) : null}
        </View>
      </Screen>

      <Sheet
        onClose={() => setCancelVisible(false)}
        title={t('order.cancelConfirm')}
        visible={cancelVisible}
      >
        <View style={{ gap: 16 }}>
          <Input
            label={t('order.cancelReason')}
            multiline
            numberOfLines={2}
            onChangeText={setCancelReason}
            placeholder={t('order.cancelReason')}
            value={cancelReason}
          />
          {order.cancellationFee ? (
            <Text tone="danger" variant="caption">
              {t('order.cancelFee', {
                amount: formatMoney(order.cancellationFee, 'RUB'),
              })}
            </Text>
          ) : null}
          <Button
            loading={cancelState.isLoading}
            onPress={confirmCancel}
            title={t('order.cancel')}
            variant="danger"
          />
        </View>
      </Sheet>

      <ReviewSheet
        onClose={() => setReviewVisible(false)}
        orderId={orderId}
        visible={reviewVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  noDriversBlock: {
    gap: 12,
    paddingTop: 8,
  },
  noDriversText: {
    color: GLASS_COLORS.error,
    fontSize: 15,
    textAlign: 'center',
  },
  panel: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  reconnectingCaption: {
    textAlign: 'right',
  },
  reconnectingWrap: {
    flex: 1,
    minWidth: 0,
  },
  root: {
    flex: 1,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
