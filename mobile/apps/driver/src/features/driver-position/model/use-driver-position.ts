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

import { createFixFilter, fixFromCoords } from './driver-fix';

/**
 * Шаг слежения на смене. 15 метров и 5 секунд — компромисс: точка на карте не «дрожит»
 * на месте от погрешности GPS, но и не отстаёт от машины в городском потоке.
 *
 * Точность — `High`: `Balanced` на Android обходится без GPS и ставит машину с ошибкой
 * в квартал.
 */
const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 15,
  timeInterval: 5000,
};

/**
 * Шаг слежения во время заказа. Эту точку видит клиент, и по ней же водитель строит путь
 * к подаче и остановкам, поэтому точность навигационная, а шаг — секунда и три метра.
 * Три метра отсекают дрожание на светофоре: стоящая машина точек не шлёт.
 */
const PRECISE_WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 3,
  timeInterval: 1000,
};

export interface DriverPositionOptions {
  /** Идёт заказ: нужна точка навигационной точности с частым обновлением. */
  precise?: boolean;
}

export interface DriverPosition {
  /** Текущая точка машины; `null` — пока не определена или нет разрешения. */
  position: GeoPoint | null;
  /** Курс машины, градусы от севера. `null` — стоит на месте или курс неизвестен. */
  heading: number | null;
  /** Скорость, м/с; `null` — неизвестна. */
  speed: number | null;
  /** Радиус погрешности текущей точки, м; `null` — неизвестен. */
  accuracy: number | null;
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

export function useDriverPosition(
  enabled: boolean,
  { precise = false }: DriverPositionOptions = {},
): DriverPosition {
  const { state, canAskAgain, request, openSettings } = useLocationPermission();

  const [position, setPosition] = useState<GeoPoint | null>(null);
  /** Курс, скорость и погрешность той же точки — отдельно, чтобы `position` оставался `GeoPoint`. */
  const [motion, setMotion] = useState<{
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
  }>({ accuracy: null, heading: null, speed: null });
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

      const acceptFix = createFixFilter();

      try {
        subscription = await Location.watchPositionAsync(
          precise ? PRECISE_WATCH_OPTIONS : WATCH_OPTIONS,
          ({ coords }) => {
            const fix = fixFromCoords(coords);
            // Точка по вышкам между точными отсчётами GPS — выброс: машина прыгнула бы
            // на соседнюю улицу и обратно, а маршрут перестроился бы от ложного места.
            if (!acceptFix(fix, Date.now())) {
              return;
            }
            setPosition({ lat: fix.lat, lng: fix.lng });
            setMotion({ accuracy: fix.accuracy, heading: fix.heading, speed: fix.speed });
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
  }, [enabled, precise, state]);

  /**
   * Вне линии позиция не отдаётся: точка на карте означает «водитель здесь и сейчас»,
   * а сойдя со смены он этого не утверждает. Само значение при этом сохраняется —
   * при возврате на линию оно мгновенно приходит из кэша и карта не ждёт нового fix.
   */
  const active = enabled && state === 'granted';

  return {
    accuracy: active ? motion.accuracy : null,
    canAskAgain,
    error: active ? error : null,
    heading: active ? motion.heading : null,
    speed: active ? motion.speed : null,
    isLocating: active && isLocating,
    openSettings,
    permissionState: state,
    position: active ? position : null,
    request,
  };
}
