/**
 * Оформление заказа (M4.2–M4.4): расчёт, тариф, оплата, комментарий, создание.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useNearbyDrivers } from '@nurtaxi/shared-core/entities/geo';
import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatDistance, formatDuration, formatPrice } from '@nurtaxi/shared-core/shared/lib';
import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import { ErrorView, Loader, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';
import { useCreateOrderMutation } from '@nurtaxi/shared-core/entities/order';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useResolveLocationForOrder, useResolvedLocationAddress } from '@/features/address';
import { useActiveOrderGuard, useOrderEstimate, OrderExtrasFields } from '@/features/order';
import {
  activeOrderChanged,
  canSubmitOrderExtras,
  childSeatChanged,
  commentChanged,
  createOrderCompat,
  draftStops,
  familyMemberSelected,
  orderForOtherChanged,
  passengerNameChanged,
  passengerPhoneChanged,
  paymentMethodSelected,
  selectOrderDraft,
  selectOrderStop,
} from '@/processes/order-flow';
import { MapCanvas, resolveOrderMapMarkers } from '@/widgets/map';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenShell,
  GlassSectionLabel,
} from '@/shared/ui';

const PAYMENT_METHODS = [PaymentMethod.Cash, PaymentMethod.Card] as const;

export function NewOrderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;

  const { hasActiveOrder, isChecking } = useActiveOrderGuard(true);
  const draft = useAppSelector(selectOrderDraft);
  const stop = useAppSelector(selectOrderStop);
  const myLocationLabel = t('addresses.myLocation');
  const resolvedPickupAddress = useResolvedLocationAddress(draft.pickup, [myLocationLabel]);
  const resolvedDropoffAddress = useResolvedLocationAddress(draft.dropoff, [myLocationLabel]);
  const resolveLocationForOrder = useResolveLocationForOrder(myLocationLabel);
  const { estimate, isEstimating, error, refetch, stopNotPriced } = useOrderEstimate();
  const [createOrder, createState] = useCreateOrderMutation();
  const [createError, setCreateError] = useState<string | null>(null);
  const nearbyDrivers = useNearbyDrivers({
    point: draft.pickup,
    regionId: draft.regionId,
  });
  const mapMarkers = useMemo(
    () =>
      resolveOrderMapMarkers({
        dropoff: draft.dropoff,
        nearbyDrivers,
        pickup: draft.pickup,
        routePolyline: estimate?.route.polyline,
        stops: stop ? [stop] : null,
      }),
    [draft.dropoff, draft.pickup, estimate?.route.polyline, nearbyDrivers, stop],
  );

  useEffect(() => {
    if (!hasActiveOrder && !isChecking && (!draft.pickup || !draft.dropoff || !draft.regionId)) {
      router.replace('/(tabs)');
    }
  }, [draft.dropoff, draft.pickup, draft.regionId, hasActiveOrder, isChecking, router]);

  if (isChecking || hasActiveOrder) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  const submit = async () => {
    if (!draft.regionId || !draft.pickup || !draft.dropoff || !canSubmitOrderExtras(draft)) {
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
      router.replace(`/order/${order.id}`);
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

  return (
    <GlassScreenShell
      footer={
        <GlassPrimaryButton
          disabled={!estimate || isEstimating || !canSubmitOrderExtras(draft)}
          loading={createState.isLoading}
          loadingTitle={t('common.loading')}
          onPress={submit}
          scale={scale}
          title={t('order.create')}
        />
      }
      title={t('order.create')}
    >
      <View
        pointerEvents="none"
        style={{ borderRadius: scale * radius.xl, height: scale * 220, overflow: 'hidden' }}
      >
        <MapCanvas
          initialPoint={draft.pickup}
          markers={mapMarkers}
          routePolyline={estimate?.route.polyline ?? null}
        />
      </View>

      <GlassCard>
        <GlassSectionLabel>{t('order.from')}</GlassSectionLabel>
        <Text style={{ color: GLASS_COLORS.title, fontSize: scale * typeScale.base }}>
          {resolvedPickupAddress ?? draft.pickup?.address ?? t('common.notSpecified')}
        </Text>
        {stop?.address ? (
          <>
            <GlassSectionLabel>{t('order.stop')}</GlassSectionLabel>
            <Text style={{ color: GLASS_COLORS.title, fontSize: scale * typeScale.base }}>
              {stop.address}
            </Text>
          </>
        ) : null}
        <GlassSectionLabel>{t('order.to')}</GlassSectionLabel>
        <Text style={{ color: GLASS_COLORS.title, fontSize: scale * typeScale.base }}>
          {resolvedDropoffAddress ?? draft.dropoff?.address ?? t('common.notSpecified')}
        </Text>
      </GlassCard>

      {isEstimating && !estimate ? <Loader label={t('order.estimate')} /> : null}

      {error ? <ErrorView error={error} onRetry={refetch} retryLabel={t('common.retry')} /> : null}

      {estimate ? (
        <GlassCard>
          <Text
            style={{
              color: GLASS_COLORS.title,
              fontSize: scale * typeScale.base,
              fontWeight: '600',
            }}
          >
            {estimate.tariff.name}
          </Text>
          <View style={{ gap: scale * 6, paddingTop: scale * 8 }}>
            <Text style={{ color: GLASS_COLORS.title, fontSize: scale * typeScale.base }}>
              {t('order.price')}: {formatPrice(estimate.price.estimated, estimate.price.currency)}
            </Text>
            <GlassCaption>
              {t('order.distance')}: {formatDistance(estimate.route.distanceM)} ·{' '}
              {t('order.duration')}: {formatDuration(estimate.route.durationS)}
            </GlassCaption>
            <GlassCaption>
              {t('order.pickupEta')}: {formatDuration(estimate.pickupEtaS)}
            </GlassCaption>
            {stopNotPriced ? <GlassCaption>{t('order.stopNotPriced')}</GlassCaption> : null}
          </View>
        </GlassCard>
      ) : null}

      <View style={{ gap: scale * 10 }}>
        <GlassSectionLabel>{t('order.paymentMethod')}</GlassSectionLabel>
        {PAYMENT_METHODS.map((method) => {
          const selected = draft.paymentMethod === method;
          return (
            <Pressable key={method} onPress={() => dispatch(paymentMethodSelected(method))}>
              <GlassCard tone={selected ? 'selected' : 'default'}>
                <Text
                  style={{
                    color: GLASS_COLORS.title,
                    fontSize: scale * typeScale.base,
                    fontWeight: selected ? '600' : '500',
                  }}
                >
                  {method === PaymentMethod.Cash ? t('payment.cash') : t('payment.card')}
                </Text>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>

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
        scale={scale}
      />

      {createError ? (
        <Text
          style={{ color: GLASS_COLORS.error, fontSize: scale * typeScale.sm, textAlign: 'center' }}
        >
          {createError}
        </Text>
      ) : null}
      {!canSubmitOrderExtras(draft) ? (
        <Text
          style={{ color: GLASS_COLORS.error, fontSize: scale * typeScale.sm, textAlign: 'center' }}
        >
          {t('order.orderForOtherInvalid')}
        </Text>
      ) : null}
    </GlassScreenShell>
  );
}
