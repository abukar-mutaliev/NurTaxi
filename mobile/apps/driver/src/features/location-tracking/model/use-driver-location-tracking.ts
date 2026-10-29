/**
 * Включение/выключение фоновой передачи геопозиции по факту выхода на линию (M8.2).
 *
 * Раньше переключатель «на линии» менял только статус на сервере — координаты никуда не
 * уходили, поэтому подбор не находил водителя в Redis GEO (`findNearby` возвращал пусто, и
 * клиент получал «свободных водителей нет» даже при наличии водителя на линии). Хук
 * привязан к серверному `onlineStatus`, а не к локальному намерению, поэтому переживает
 * перезапуск приложения посреди смены.
 */
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

import { resolveCurrentPosition } from '@nurtaxi/shared-core/features/geolocation';

import { useAppDispatch } from '@/app/store/hooks';
import { locationTrackingChanged } from '@/processes/shift';

import { DRIVER_LOCATION_TASK, sendDriverLocationUpdate } from './location-task';

const LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 15_000,
  distanceInterval: 50,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Nur Taxi',
    notificationBody: 'Передаём вашу позицию, чтобы вы получали заказы рядом',
  },
};

/**
 * Разрешение «Всегда» нужно для обновлений, когда приложение свёрнуто. Его отсутствие не
 * должно мешать выйти на линию — задача продолжит работать хотя бы на переднем плане.
 */
async function ensurePermissions(): Promise<boolean> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const foregroundGranted =
    foreground.status === Location.PermissionStatus.GRANTED
      ? true
      : (await Location.requestForegroundPermissionsAsync()).status ===
        Location.PermissionStatus.GRANTED;

  if (!foregroundGranted) {
    return false;
  }

  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    // Expo Go и некоторые окружения не поддерживают фоновые разрешения — не критично.
  }

  return true;
}

/**
 * Запуск и остановка идут строго по очереди. Статус водителя мигает при принятии заказа
 * (`online` → `busy`, перезапрос профиля), и две остановки, начатые одновременно, обе
 * видели задачу запущенной: вторая падала с `TaskNotFoundException`, и поверх экрана
 * заказа всплывала ошибка «Call to function 'ExpoLocation.stopLocationUpdatesAsync' has
 * been rejected».
 */
let queue: Promise<void> = Promise.resolve();

function enqueue(operation: () => Promise<void>): void {
  queue = queue.then(operation).catch(() => {
    // Сбой одной операции не должен останавливать очередь: следующая смена статуса повторит.
  });
}

/** `active` — `profile.onlineStatus === 'online'` на сервере. */
export function useDriverLocationTracking(active: boolean): void {
  const dispatch = useAppDispatch();
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function start(): Promise<void> {
      if (startedRef.current) {
        return;
      }

      const permitted = await ensurePermissions();
      if (!permitted || cancelled) {
        return;
      }

      // Не ждём первого фикса от фоновой задачи — шлём последнюю известную точку сразу,
      // чтобы водитель попал в Redis GEO без задержки в `timeInterval`.
      const current = await resolveCurrentPosition({ forceRefresh: true });
      if (current && !cancelled) {
        sendDriverLocationUpdate(current.lat, current.lng);
      }

      if (cancelled) {
        return;
      }

      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
      if (!alreadyRunning && !cancelled) {
        await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, LOCATION_OPTIONS);
      }

      if (!cancelled) {
        startedRef.current = true;
        dispatch(locationTrackingChanged(true));
      }
    }

    async function stop(): Promise<void> {
      if (!startedRef.current) {
        return;
      }

      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
      if (alreadyRunning) {
        try {
          await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
        } catch {
          // Задачи уже нет (её сняли раньше или после перезапуска) — нужного и добивались.
        }
      }

      startedRef.current = false;
      dispatch(locationTrackingChanged(false));
    }

    enqueue(active ? start : stop);

    return () => {
      cancelled = true;
    };
  }, [active, dispatch]);
}
