/**
 * Расчёт стоимости заказа (M4.2): `POST /orders/estimate` при готовом черновике.
 */
import { useCallback, useEffect, useRef } from 'react';

import { toAppError, type AppError } from '@nurtaxi/shared-core/shared/api';
import { toApiGeoLocation } from '@nurtaxi/shared-core/shared/lib';
import { useEstimateOrderMutation } from '@nurtaxi/shared-core/entities/order';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { estimateReceived, selectCanEstimate, selectOrderDraft } from '@/processes/order-flow';

export function useOrderEstimate(): {
  estimate: ReturnType<typeof selectOrderDraft>['estimate'];
  isEstimating: boolean;
  error: AppError | null;
  refetch: () => Promise<void>;
} {
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectOrderDraft);
  const canEstimate = useAppSelector(selectCanEstimate);
  const [estimateOrder, state] = useEstimateOrderMutation();
  const lastKeyRef = useRef('');

  const runEstimate = useCallback(async () => {
    const { regionId, pickup, dropoff, tariffId } = draft;
    if (!regionId || !pickup || !dropoff) {
      return;
    }
    const result = await estimateOrder({
      regionId,
      pickup: toApiGeoLocation(pickup),
      dropoff: toApiGeoLocation(dropoff),
      tariffId: tariffId ?? undefined,
    }).unwrap();
    dispatch(estimateReceived(result));
  }, [dispatch, draft, estimateOrder]);

  useEffect(() => {
    if (!canEstimate || !draft.pickup || !draft.dropoff || !draft.regionId) {
      return;
    }
    const key = [
      draft.regionId,
      draft.pickup.lat,
      draft.pickup.lng,
      draft.dropoff.lat,
      draft.dropoff.lng,
      draft.tariffId,
    ].join(':');
    if (key === lastKeyRef.current) {
      return;
    }
    lastKeyRef.current = key;
    void runEstimate().catch(() => {
      lastKeyRef.current = '';
    });
  }, [canEstimate, draft, runEstimate]);

  return {
    estimate: draft.estimate,
    isEstimating: state.isLoading,
    error: state.error ? toAppError(state.error) : null,
    refetch: runEstimate,
  };
}
