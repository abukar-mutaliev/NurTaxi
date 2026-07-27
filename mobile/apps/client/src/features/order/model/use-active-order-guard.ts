/**
 * Блокировка нового заказа при активном (M4.9) и синхронизация activeOrderId.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { isActiveOrder, useGetOrderQuery } from '@nurtaxi/shared-core/entities/order';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { activeOrderChanged, selectActiveOrderId } from '@/processes/order-flow';

export function useActiveOrderGuard(redirect = false): {
  activeOrderId: string | null;
  hasActiveOrder: boolean;
  isChecking: boolean;
} {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeOrderId = useAppSelector(selectActiveOrderId);

  const { data: order, isLoading } = useGetOrderQuery(activeOrderId ?? '', {
    skip: !activeOrderId,
  });

  const hasActiveOrder = Boolean(order && isActiveOrder(order.status));

  useEffect(() => {
    if (!activeOrderId || isLoading) {
      return;
    }
    if (order && !isActiveOrder(order.status)) {
      dispatch(activeOrderChanged(null));
    }
  }, [activeOrderId, dispatch, isLoading, order]);

  useEffect(() => {
    if (redirect && hasActiveOrder && activeOrderId) {
      router.replace(`/order/${activeOrderId}`);
    }
  }, [activeOrderId, hasActiveOrder, redirect, router]);

  return {
    activeOrderId: hasActiveOrder ? activeOrderId : null,
    hasActiveOrder,
    isChecking: Boolean(activeOrderId) && isLoading,
  };
}
