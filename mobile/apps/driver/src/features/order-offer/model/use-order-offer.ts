/**
 * Входящее предложение заказа (`§15.3`, M8.3).
 *
 * Сервер шлёт `order.offer` в личную комнату водителя, когда подбор выбрал его кандидатом.
 * Предложение живёт до `expiresAt` — после этого подбор уходит к следующему водителю,
 * поэтому карточку скрываем сами, не дожидаясь ответа сервера на «Принять».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  realtimeClient,
  RealtimeEvent,
  selectRealtimeStatus,
  type OrderOfferEvent,
  type WithRealtimeState,
} from '@nurtaxi/shared-core/features/realtime';

/** Сколько секунд осталось до истечения предложения. */
function secondsLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Number.isFinite(diff) ? Math.max(0, Math.ceil(diff / 1000)) : 0;
}

export interface OrderOfferState {
  offer: OrderOfferEvent | null;
  /** Обратный отсчёт для прогресс-бара на карточке. */
  secondsLeft: number;
  dismiss: () => void;
}

export function useOrderOffer(): OrderOfferState {
  const [offer, setOffer] = useState<OrderOfferEvent | null>(null);
  const [remaining, setRemaining] = useState(0);

  // Статус сокета в зависимостях: `realtimeClient.on` вешает обработчик на текущий
  // сокет, поэтому после переподключения подписку нужно оформить заново.
  const status = useSelector((state: WithRealtimeState) => selectRealtimeStatus(state));

  useEffect(() => {
    const handleOffer = (event: OrderOfferEvent) => {
      setOffer(event);
      setRemaining(secondsLeft(event.expiresAt));
    };

    return realtimeClient.on(RealtimeEvent.OrderOffer, handleOffer);
  }, [status]);

  useEffect(() => {
    if (!offer) {
      return;
    }

    const tick = () => {
      const left = secondsLeft(offer.expiresAt);
      setRemaining(left);
      if (left === 0) {
        setOffer(null);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [offer]);

  const dismiss = useCallback(() => setOffer(null), []);

  return useMemo(
    () => ({ offer, secondsLeft: remaining, dismiss }),
    [offer, remaining, dismiss],
  );
}
