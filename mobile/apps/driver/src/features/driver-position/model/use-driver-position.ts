/**
 * Собственная позиция водителя на линии (M8.2).
 *
 * Выйдя на линию, водитель должен видеть, где он находится: без этого карта показывает
 * центр города, и непонятно, куда смотреть. Поэтому здесь не разовое определение точки,
 * как в `useCurrentPosition`, а слежение: машина едет, и точка обязана ехать вместе с ней.
 *
 * Разрешение запрашивается в момент выхода на линию, а не при запуске приложения: до смены
 * геопозиция не нужна, а системный диалог на старте выглядит немотивированным. Отказ не
 * ломает экран — карта просто остаётся на обзорной камере, а водитель видит подсказку.
 */
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import {
  resolveCurrentPosition,
  useLocationPermission,
  type LocationPermissionState,
} from '@nurtaxi/shared-core/features/geolocation';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

/**
 * Шаг слежения. 15 метров и 5 секунд — компромисс: точка на карте не «дрожит» на месте
 * от погрешности GPS, но и не отстаёт от машины в городском потоке.
 */
const WATCH_DISTANCE_M = 15;
const WATCH_INTERVAL_MS = 5000;

export interface DriverPosition {
  /** Текущая точка машины; `null` — пока не определена или нет разрешения. */
  position: GeoPoint | null;
  permissionState: LocationPermissionState;
  /** Разрешение отклонено навсегда — помочь может только экран настроек. */
  canAskAgain: boolean;
  /** Спросить разрешение ещё раз — пока система позволяет (`canAskAgain`). */
  request: () => Promise<boolean>;
  /** Идёт определение первой точки: на карте ещё нечего показывать. */
  isLocating: boolean;
  error: string | null;
  openSettings: () => Promise<void>;
}

export function useDriverPosition(enabled: boolean): DriverPosition {
  const { state, canAskAgain, request, openSettings } = useLocationPermission();

  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Разрешение спрашиваем ровно один раз за сессию. Без этого повторные выходы на линию
   * дёргали бы системный диалог снова и снова, а `request` меняет состояние хука
   * разрешений и сам по себе перезапустил бы эффект.
   */
  const askedRef = useRef(false);

  useEffect(() => {
    if (!enabled || state !== 'undetermined' || askedRef.current) {
      return;
    }
    askedRef.current = true;
    void request();
  }, [enabled, state, request]);

  useEffect(() => {
    if (!enabled || state !== 'granted') {
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      setIsLocating(true);
      setError(null);

      /**
       * Сначала быстрая точка из кэша или last known — карта встаёт на место почти
       * мгновенно. Свежий fix придёт следом через подписку и уточнит положение.
       */
      const initial = await resolveCurrentPosition();
      if (cancelled) {
        return;
      }

      if (initial) {
        setPosition(initial);
      }
      setIsLocating(false);

      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: WATCH_DISTANCE_M,
            timeInterval: WATCH_INTERVAL_MS,
          },
          ({ coords }) => {
            setPosition({ lat: coords.latitude, lng: coords.longitude });
          },
        );
      } catch {
        if (!cancelled && !initial) {
          setError('Не удалось определить местоположение');
        }
        return;
      }

      // Подписка успела открыться уже после ухода с экрана — закрываем сразу.
      if (cancelled) {
        subscription.remove();
        subscription = null;
      }
    };

    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
      setIsLocating(false);
    };
  }, [enabled, state]);

  /**
   * Вне линии позиция не отдаётся: точка на карте означает «водитель здесь и сейчас»,
   * а сойдя со смены он этого не утверждает. Само значение при этом сохраняется —
   * при возврате на линию оно мгновенно приходит из кэша и карта не ждёт нового fix.
   */
  const active = enabled && state === 'granted';

  return {
    canAskAgain,
    error: active ? error : null,
    isLocating: active && isLocating,
    openSettings,
    permissionState: state,
    position: active ? position : null,
    request,
  };
}
