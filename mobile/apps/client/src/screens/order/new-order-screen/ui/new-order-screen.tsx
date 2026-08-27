/**
 * Оформление заказа (M4.2–M4.4): расчёт, тариф, оплата, комментарий, создание.
 */
import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatDistance, formatDuration, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';
import { ErrorView, Loader, Text } from '@nurtaxi/shared-core/shared/ui';
import { useCreateOrderMutation } from '@nurtaxi/shared-core/entities/order';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useResolveLocationForOrder, useResolvedLocationAddress } from '@/features/address';
import { useActiveOrderGuard, useOrderEstimate } from '@/features/order';
import {
  activeOrderChanged,
  commentChanged,
  paymentMethodSelected,
  selectOrderDraft,
} from '@/processes/order-flow';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenShell,
  GlassSectionLabel,
  GlassTextField,
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
  const myLocationLabel = t('addresses.myLocation');
  const resolvedPickupAddress = useResolvedLocationAddress(draft.pickup, [myLocationLabel]);
  const resolvedDropoffAddress = useResolvedLocationAddress(draft.dropoff, [myLocationLabel]);
  const resolveLocationForOrder = useResolveLocationForOrder(myLocationLabel);
  const { estimate, isEstimating, error, refetch } = useOrderEstimate();
  const [createOrder, createState] = useCreateOrderMutation();
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasActiveOrder && !isChecking && (!draft.pickup || !draft.dropoff || !draft.regionId)) {
      router.replace('/(tabs)');
    }
  }, [draft.dropoff, draft.pickup, draft.regionId, hasActiveOrder, isChecking, router]);

  if (isChecking || hasActiveOrder) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  const submit = async () => {
    if (!draft.regionId || !draft.pickup || !draft.dropoff) {
      return;
    }
    setCreateError(null);
    try {
      const order = await createOrder({
        regionId: draft.regionId,
        pickup: await resolveLocationForOrder(draft.pickup),
        dropoff: await resolveLocationForOrder(draft.dropoff),
        tariffId: draft.tariffId ?? undefined,
        paymentMethod: draft.paymentMethod,
        comment: draft.comment.trim() || undefined,
        familyMemberId: draft.familyMemberId ?? undefined,
      }).unwrap();
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
          disabled={!estimate || isEstimating}
          loading={createState.isLoading}
          loadingTitle={t('common.loading')}
          onPress={submit}
          scale={scale}
          title={t('order.create')}
        />
      }
      title={t('order.create')}
    >
      <GlassCard>
        <GlassSectionLabel>{t('order.from')}</GlassSectionLabel>
        <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15 }}>
          {resolvedPickupAddress ?? draft.pickup?.address ?? t('common.notSpecified')}
        </Text>
        <GlassSectionLabel>{t('order.to')}</GlassSectionLabel>
        <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15 }}>
          {resolvedDropoffAddress ?? draft.dropoff?.address ?? t('common.notSpecified')}
        </Text>
      </GlassCard>

      {isEstimating && !estimate ? <Loader label={t('order.estimate')} /> : null}

      {error ? <ErrorView error={error} onRetry={refetch} retryLabel={t('common.retry')} /> : null}

      {estimate ? (
        <GlassCard>
          <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 16, fontWeight: '600' }}>
            {estimate.tariff.name}
          </Text>
          <View style={{ gap: scale * 6, paddingTop: scale * 8 }}>
            <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15 }}>
              {t('order.price')}: {formatMoney(estimate.price.estimated, estimate.price.currency)}
            </Text>
            <GlassCaption>
              {t('order.distance')}: {formatDistance(estimate.route.distanceM)} ·{' '}
              {t('order.duration')}: {formatDuration(estimate.route.durationS)}
            </GlassCaption>
            <GlassCaption>
              {t('order.pickupEta')}: {formatDuration(estimate.pickupEtaS)}
            </GlassCaption>
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
                    fontSize: scale * 15,
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

      <GlassTextField
        label={t('order.comment')}
        multiline
        numberOfLines={3}
        onChangeText={(value) => dispatch(commentChanged(value))}
        placeholder={t('order.commentPlaceholder')}
        scale={scale}
        value={draft.comment}
      />

      {createError ? (
        <Text style={{ color: GLASS_COLORS.error, fontSize: scale * 13, textAlign: 'center' }}>
          {createError}
        </Text>
      ) : null}
    </GlassScreenShell>
  );
}
