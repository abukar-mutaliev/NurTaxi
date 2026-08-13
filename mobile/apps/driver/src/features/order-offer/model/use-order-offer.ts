/**
 * Входящее предложение заказа (`§15.3`, M8.3).
 *
 * Предложение приходит двумя путями, и оба нужны:
 *  - событие `order.offer` по сокету — мгновенно, пока приложение на переднем плане;
 *  - запрос `GET /driver/orders/offer` — когда приложение вернулось из фона.
 *
 * Второй путь не роскошь: свёрнутое приложение на Android теряет сокет за считаные
 * секунды, событие уходит в пустую комнату и пропадает навсегда. Без запроса водитель,
 * на секунду вышедший в мессенджер, молча терял бы заказы.
 *
 * Предложение живёт до `expiresAt` — после этого подбор уходит к следующему водителю,
 * поэтому карточку скрываем сами, не дожидаясь ответа сервера на «Принять».
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';

import { useLazyGetPendingOfferQuery } from '@nurtaxi/shared-core/entities/driver';
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
  const [fetchPendingOffer] = useLazyGetPendingOfferQuery();

  /**
   * Отклонённое предложение не должно всплывать снова: запрос при возврате из фона
   * получил бы его от сервера ещё раз, пока не истёк срок.
   */
  const dismissedRef = useRef<string | null>(null);

  // Статус сокета в зависимостях: `realtimeClient.on` вешает обработчик на текущий
  // сокет, поэтому после переподключения подписку нужно оформить заново.
  const status = useSelector((state: WithRealtimeState) => selectRealtimeStatus(state));

  const showOffer = useCallback((next: OrderOfferEvent) => {
    if (dismissedRef.current === next.orderId || secondsLeft(next.expiresAt) === 0) {
      return;
    }
    setOffer(next);
    setRemaining(secondsLeft(next.expiresAt));
  }, []);

  useEffect(() => {
    const handleOffer = (event: OrderOfferEvent) => {
      showOffer(event);
    };

    return realtimeClient.on(RealtimeEvent.OrderOffer, handleOffer);
  }, [status, showOffer]);

  /**
   * Спрашиваем сервер при появлении экрана, после переподключения сокета и при каждом
   * возврате на передний план. Пустой ответ ничего не сбрасывает: карточку убирает
   * обратный отсчёт, а гасить её ответом «сейчас ничего нет» опасно — событие по сокету
   * и запрос могут разойтись на доли секунды.
   */
  const syncPendingOffer = useCallback(() => {
    void fetchPendingOffer()
      .unwrap()
      .then((pending) => {
        if (pending) {
          showOffer(pending);
        }
      })
      .catch(() => {
        // Молча: связь у водителя рвётся регулярно, следующая попытка будет при возврате.
      });
  }, [fetchPendingOffer, showOffer]);

  useEffect(() => {
    syncPendingOffer();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncPendingOffer();
      }
    });

    return () => subscription.remove();
  }, [syncPendingOffer]);

  useEffect(() => {
    if (status === 'connected') {
      syncPendingOffer();
    }
  }, [status, syncPendingOffer]);

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

  const dismiss = useCallback(() => {
    setOffer((current) => {
      if (current) {
        dismissedRef.current = current.orderId;
      }
      return null;
    });
  }, []);

  return useMemo(() => ({ offer, secondsLeft: remaining, dismiss }), [offer, remaining, dismiss]);
}
