/**
 * Передача позиции водителя на сервер, пока он на линии (M8.2).
 *
 * Без этого водитель «на линии» существует только в своей базе строк: подбор машин ищет
 * их в гео-множестве Redis, куда попадают лишь те, кто прислал координаты. Водитель без
 * позиции не находится нигде, и заказ ему не придёт.
 *
 * Основной канал — событие `driver.location` по WebSocket. Если сокет не подключён,
 * `sendDriverLocation` возвращает `false`, и та же точка уходит REST-запросом.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useUpdateDriverLocationMutation } from '@nurtaxi/shared-core/entities/driver';
import { realtimeClient } from '@nurtaxi/shared-core/features/realtime';
import { haversineDistance } from '@nurtaxi/shared-core/shared/lib';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

import { useAppDispatch } from '@/app/store/hooks';

import { locationTrackingChanged, positionSent } from './shift.slice';

/**
 * Порог отправки. Слать каждый GPS-тик незачем: подбору машин хватает свежести в
 * несколько секунд, а лишние запросы жгут батарею и трафик. Поэтому точка уходит,
 * когда водитель заметно сместился либо когда прошло достаточно времени — второе
 * важно на стоянке, чтобы сервер видел, что водитель всё ещё здесь.
 */
const MIN_DISTANCE_M = 30;
const MAX_SILENCE_MS = 15_000;

export function useLocationReporting(position: GeoPoint | null, enabled: boolean): void {
  const dispatch = useAppDispatch();
  const [updateLocation] = useUpdateDriverLocationMutation();

  const lastSentRef = useRef<{ point: GeoPoint; at: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastSentRef.current = null;
      return;
    }

    dispatch(locationTrackingChanged(true));
    return () => {
      dispatch(locationTrackingChanged(false));
    };
  }, [dispatch, enabled]);

  const send = useCallback(
    (point: GeoPoint) => {
      /**
       * Отметку о попытке ставим до отправки: иначе при неудачном запросе каждый следующий
       * GPS-тик снова считался бы «пора слать», и приложение забило бы очередь повторами.
       */
      lastSentRef.current = { at: Date.now(), point };

      const sentOverSocket = realtimeClient.sendDriverLocation(point.lat, point.lng);
      if (sentOverSocket) {
        dispatch(positionSent(point));
        return;
      }

      void updateLocation(point)
        .unwrap()
        .then(() => {
          dispatch(positionSent(point));
        })
        .catch(() => {
          // Молча: связь у водителя рвётся регулярно, следующая точка уйдёт со следующим
          // тиком. Ронять экран смены из-за одного неудачного запроса нельзя.
        });
    },
    [dispatch, updateLocation],
  );

  /**
   * Тик обновляется таймером, а не только приходом новой точки. Без него стоящая машина
   * переставала бы отчитываться совсем: `watchPositionAsync` молчит, пока водитель не
   * сдвинулся, эффект не перезапускается — и сервер считает водителя пропавшим.
   */
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setInterval(() => setTick((value) => value + 1), MAX_SILENCE_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !position) {
      return;
    }

    const previous = lastSentRef.current;
    const movedEnough = !previous || haversineDistance(previous.point, position) >= MIN_DISTANCE_M;
    const silentTooLong = !previous || Date.now() - previous.at >= MAX_SILENCE_MS;

    if (!movedEnough && !silentTooLong) {
      return;
    }

    send(position);
    // `tick` в зависимостях намеренно: он и есть сигнал «пора проверить, не пора ли слать».
  }, [enabled, position, send, tick]);
}
