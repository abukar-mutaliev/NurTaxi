/**
 * Блокировка нового заказа при активном (M4.9) и синхронизация activeOrderId.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { isActiveOrder, useGetOrderQuery } from '@nurtaxi/shared-core/entities/order';
import { selectIsRealtimeOnline } from '@nurtaxi/shared-core/features/realtime';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { activeOrderChanged, selectActiveOrderId } from '@/processes/order-flow';

/**
 * Как часто перечитывать активный заказ, пока нет сокета.
 *
 * Карточка активной поездки живёт на главном экране, а не только на экране заказа,
 * и до сих пор целиком зависела от событий по WebSocket. Свёрнутое приложение на
 * Android теряет сокет за считаные секунды и пропускает всё: клиент не узнавал, что
 * водитель принял заказ, выехал и прибыл. Пять секунд — тот же интервал, что на
 * экране заказа: заметно быстрее, чем водитель проезжает значимое расстояние.
 */
const OFFLINE_POLL_MS = 5000;

export function useActiveOrderGuard(redirect = false): {
  activeOrderId: string | null;
  hasActiveOrder: boolean;
  isChecking: boolean;
} {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeOrderId = useAppSelector(selectActiveOrderId);

  const isRealtimeOnline = useAppSelector(selectIsRealtimeOnline);

  const {
    data: order,
    isLoading,
    refetch,
  } = useGetOrderQuery(activeOrderId ?? '', {
    skip: !activeOrderId,
    // При живом сокете статусы приходят событиями — опрос только зря жёг бы батарею.
    pollingInterval: isRealtimeOnline ? 0 : OFFLINE_POLL_MS,
  });

  /**
   * Догоняем состояние в момент подключения сокета.
   *
   * Одного опроса при обрыве мало: возвращаясь из фона, приложение поднимает сокет за
   * секунду-другую, опрос тут же выключается — а событие, прошедшее мимо, пока связи не
   * было, никто уже не повторит. Socket.IO не хранит сообщения для отсутствующих.
   * Поэтому при каждом подключении перечитываем заказ целиком.
   */
  useEffect(() => {
    if (!activeOrderId || !isRealtimeOnline) {
      return;
    }
    void refetch();
  }, [activeOrderId, isRealtimeOnline, refetch]);

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
