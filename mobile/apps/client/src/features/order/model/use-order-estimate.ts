/**
 * Расчёт стоимости заказа (M4.2): `POST /orders/estimate` при готовом черновике.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { toAppError, type AppError } from '@nurtaxi/shared-core/shared/api';
import { toApiGeoLocation } from '@nurtaxi/shared-core/shared/lib';
import { useEstimateOrderMutation } from '@nurtaxi/shared-core/entities/order';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  draftStops,
  estimateReceived,
  isUnknownOrderStopsError,
  markStopsUnsupported,
  selectCanEstimate,
  selectOrderDraft,
  serverAcceptsStops,
} from '@/processes/order-flow';

export function useOrderEstimate(): {
  estimate: ReturnType<typeof selectOrderDraft>['estimate'];
  isEstimating: boolean;
  error: AppError | null;
  /** Сервер не знает остановок: цена посчитана без неё (см. `createOrderCompat`). */
  stopNotPriced: boolean;
  refetch: () => Promise<void>;
} {
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectOrderDraft);
  const canEstimate = useAppSelector(selectCanEstimate);
  const [estimateOrder, state] = useEstimateOrderMutation();
  const lastKeyRef = useRef('');
  const [stopNotPriced, setStopNotPriced] = useState(false);

  const runEstimate = useCallback(async () => {
    const { regionId, pickup, stop, dropoff, tariffId } = draft;
    if (!regionId || !pickup || !dropoff) {
      return;
    }
    const base = {
      regionId,
      pickup: toApiGeoLocation(pickup),
      dropoff: toApiGeoLocation(dropoff),
      tariffId: tariffId ?? undefined,
    };
    const stops = draftStops(stop);
    const sendStops = Boolean(stops) && serverAcceptsStops();

    let result;
    let priced = sendStops || !stops;
    try {
      result = await estimateOrder(sendStops ? { ...base, stops } : base).unwrap();
    } catch (cause) {
      // Старый сервер не знает `stops` — считаем без остановки, а не показываем ошибку полей.
      if (!sendStops || !isUnknownOrderStopsError(toAppError(cause as never))) {
        throw cause;
      }
      markStopsUnsupported();
      result = await estimateOrder(base).unwrap();
      priced = false;
    }
    setStopNotPriced(!priced);
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
      // Остановка меняет маршрут и цену — пересчитываем и при её добавлении или удалении.
      draft.stop?.lat ?? '',
      draft.stop?.lng ?? '',
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
    stopNotPriced: Boolean(draft.stop) && stopNotPriced,
    refetch: runEstimate,
  };
}
