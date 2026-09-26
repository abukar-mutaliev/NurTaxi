/**
 * Главный экран клиента (M3.3): карта, поиск адреса, оформление заказа (Figma node 39:1106).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatDuration } from '@nurtaxi/shared-core/shared/lib';
import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import {
  formatOrderStatusLabel,
  orderStage,
  useCreateOrderMutation,
  useGetOrderQuery,
} from '@nurtaxi/shared-core/entities/order';
import {
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';
import { useLiveOrderRoute } from '@nurtaxi/shared-core/features/navigation';
import { selectDriverPosition, useOrderRealtime } from '@nurtaxi/shared-core/features/realtime';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  isAutoPickupLocation,
  shouldSyncAutoPickup,
  useOrderRegion,
  useResolveLocationForOrder,
  useResolvedLocationAddress,
} from '@/features/address';
import { useActiveOrderGuard, useOrderEstimate, OrderExtrasFields } from '@/features/order';
import {
  activeOrderChanged,
  canSubmitOrderExtras,
  childSeatChanged,
  commentChanged,
  extrasFromDraft,
  familyMemberSelected,
  isUnknownOrderExtrasError,
  orderForOtherChanged,
  passengerNameChanged,
  passengerPhoneChanged,
  paymentMethodSelected,
  pickupSelected,
  selectActiveOrderId,
  selectOrderDraft,
} from '@/processes/order-flow';
import {
  MapCanvas,
  MapCenterButton,
  type MapCanvasHandle,
  type MapMarker,
  resolveOrderMapMarkers,
} from '@/widgets/map';

import { HomeMapHeader } from './home-map-header';
import { HomeOrderSheet } from './home-order-sheet';
import { PaymentMethodSheet } from './payment-method-sheet';

import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';
import { glassShadow } from '@/shared/ui/glass-shadow';

const mapColors = {
  etaBadge: 'rgba(46,35,49,0.88)',
  etaShadow: 'rgba(89,71,31,0.16)',
} as const;

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

  const draft = useAppSelector(selectOrderDraft);
  const { pickup, dropoff } = draft;
  const activeOrderId = useAppSelector(selectActiveOrderId);
  const effectiveActiveId = guardedActiveId ?? activeOrderId;
  useOrderRealtime(hasActiveOrder ? effectiveActiveId : null);

  const { estimate, isEstimating, error: estimateError } = useOrderEstimate();
  const [createOrder, createState] = useCreateOrderMutation();
  const [createError, setCreateError] = useState<string | null>(null);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [orderSheetHeight, setOrderSheetHeight] = useState(0);

  const { data: activeOrder } = useGetOrderQuery(effectiveActiveId ?? '', {
    skip: !effectiveActiveId,
  });
  const driverPosition = useAppSelector(selectDriverPosition(effectiveActiveId ?? ''));
  const liveRoute = useLiveOrderRoute({
    dropoff: { lat: activeOrder?.dropoffLat ?? 0, lng: activeOrder?.dropoffLng ?? 0 },
    enabled: Boolean(
      activeOrder &&
      (orderStage(activeOrder.status) === 'waiting-driver' ||
        orderStage(activeOrder.status) === 'riding'),
    ),
    origin: driverPosition ?? null,
    pickup: { lat: activeOrder?.pickupLat ?? 0, lng: activeOrder?.pickupLng ?? 0 },
    status: activeOrder?.status ?? '',
  });

  const showOrderSheet = Boolean(pickup && dropoff && !hasActiveOrder);
  const bottomInset = tabBarInset;

  const myLocationLabel = t('addresses.myLocation');
  const resolvedPickupAddress = useResolvedLocationAddress(pickup, [myLocationLabel]);
  const resolvedDropoffAddress = useResolvedLocationAddress(dropoff, [myLocationLabel]);
  const resolveLocationForOrder = useResolveLocationForOrder(myLocationLabel);

  useEffect(() => {
    if (!position || hasActiveOrder) {
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
  }, [dispatch, hasActiveOrder, myLocationLabel, pickup, position]);

  const markers = useMemo((): MapMarker[] => {
    if (activeOrder) {
      return resolveOrderMapMarkers({
        driver: driverPosition ?? null,
        dropoff: {
          address: activeOrder.dropoffAddress,
          lat: activeOrder.dropoffLat,
          lng: activeOrder.dropoffLng,
        },
        pickup: {
          address: activeOrder.pickupAddress,
          lat: activeOrder.pickupLat,
          lng: activeOrder.pickupLng,
        },
        routePolyline: activeOrder.route?.polyline,
      });
    }

    return resolveOrderMapMarkers({
      dropoff,
      pickup,
      routePolyline: estimate?.route.polyline,
    });
  }, [activeOrder, driverPosition, dropoff, estimate?.route.polyline, pickup]);

  const routePoints = liveRoute.points?.length ? liveRoute.points : null;
  const routePolyline = routePoints
    ? null
    : (activeOrder?.route?.polyline ?? estimate?.route.polyline ?? null);

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
  const [isHomeFocused, setIsHomeFocused] = useState(true);
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

  const mapMarkers = isHomeFocused ? markers : frozenMapState.markers;
  const mapPolyline = isHomeFocused ? routePolyline : frozenMapState.routePolyline;
  const mapRoutePoints = isHomeFocused ? routePoints : frozenMapState.routePoints;

  useEffect(() => {
    if (!isHomeFocused) {
      return;
    }

    if (activeOrder?.id || (pickup && dropoff)) {
      mapRef.current?.fitToRoute();
    } else if (position) {
      mapRef.current?.centerOn(position, 0.01);
    }
  }, [activeOrder?.id, dropoff, estimate?.route.polyline, isHomeFocused, pickup, position]);

  const centerOnMyLocation = () => {
    if (!position) {
      return;
    }
    mapRef.current?.centerOn(position, 0.01);
  };

  const openSearch = (field: 'pickup' | 'dropoff' = 'dropoff') => {
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
    const payload = {
      regionId: draft.regionId,
      pickup: await resolveLocationForOrder(draft.pickup),
      dropoff: await resolveLocationForOrder(draft.dropoff),
      tariffId: draft.tariffId ?? undefined,
      paymentMethod: draft.paymentMethod,
    };
    try {
      try {
        const order = await createOrder({
          ...payload,
          ...extrasFromDraft(draft),
        }).unwrap();
        dispatch(activeOrderChanged(order.id));
        router.push(`/order/${order.id}`);
        return;
      } catch (cause) {
        const appError = toAppError(cause as never);
        if (!isUnknownOrderExtrasError(appError)) {
          throw cause;
        }
      }
      const order = await createOrder({
        ...payload,
        ...extrasFromDraft(draft, 'legacy'),
      }).unwrap();
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

  const openPaymentMethods = () => {
    setPaymentSheetVisible(true);
  };

  const paymentLabel =
    draft.paymentMethod === PaymentMethod.Card ? t('payment.cardMasked') : t('payment.cash');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.mapLayer}>
        <MapCanvas
          initialPoint={position}
          markers={mapMarkers}
          ref={mapRef}
          routePoints={mapRoutePoints}
          routePolyline={mapPolyline}
        />
      </View>

      <HomeMapHeader
        onMenuPress={() => router.push('/notifications')}
        onSearchPress={() => openSearch('dropoff')}
        searchLabel={hasActiveOrder ? t('order.goToActive') : t('order.where')}
      />

      {estimate && showOrderSheet ? (
        <View pointerEvents="none" style={styles.etaBadgeWrap}>
          <View style={styles.etaBadge}>
            <Text style={styles.etaText}>~{formatDuration(estimate.pickupEtaS)}</Text>
          </View>
        </View>
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
            <Text numberOfLines={1} style={styles.activeOrderSubtitle}>
              {activeOrder.dropoffAddress}
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
            (!canSubmitOrderExtras(draft) ? t('order.orderForOtherInvalid') : null)
          }
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
          onDropoffPress={() => openSearch('dropoff')}
          onOrder={submitOrder}
          onPaymentPress={openPaymentMethods}
          onPickupPress={() => openSearch('pickup')}
          onTariffPress={() => undefined}
          orderLabel={t('order.createNur')}
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
        disabled={!position}
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
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...glassShadow({ color: 'rgba(89,71,31,0.06)' }),
  },
  activeOrderSubtitle: {
    color: '#7A6E78',
    fontSize: 13,
  },
  activeOrderTitle: {
    color: '#2E2331',
    fontSize: 14,
    fontWeight: '600',
  },
  etaBadge: {
    alignSelf: 'center',
    backgroundColor: mapColors.etaBadge,
    borderRadius: 15,
    elevation: 2,
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...glassShadow({ color: mapColors.etaShadow, offset: { width: 0, height: 3 }, radius: 10 }),
  },
  etaBadgeWrap: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: '28%',
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionBanner: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    left: 16,
    padding: 12,
    position: 'absolute',
    right: 16,
  },
  permissionText: {
    color: '#2E2331',
    fontSize: 13,
    textAlign: 'center',
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  mapLayer: {
    flex: 1,
  },
});
