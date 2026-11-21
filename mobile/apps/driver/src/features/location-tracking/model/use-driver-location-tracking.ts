/**
 * Включение/выключение фоновой передачи геопозиции по серверному статусу водителя (M8.2).
 *
 * Раньше переключатель «на линии» менял только статус на сервере — координаты никуда не
 * уходили, поэтому подбор не находил водителя в Redis GEO (`findNearby` возвращал пусто, и
 * клиент получал «свободных водителей нет» даже при наличии водителя на линии). Хук
 * привязан к серверному `onlineStatus`, а не к локальному намерению, поэтому переживает
 * перезапуск приложения посреди смены.
 *
 * Режимов два, и оба держат фоновую задачу включённой:
 *  - `online` — свободен, ждёт заказ: точка нужна подбору, хватает редких обновлений;
 *  - `order` — везёт заказ (`busy`): клиент смотрит на машину в реальном времени, поэтому
 *    точность максимальная и обновления частые.
 *
 * Прежде задача работала только при `online` и останавливалась, как только водитель
 * принимал заказ. Координаты тогда слал один экран заказа, пока был на переднем плане:
 * стоило водителю открыть навигатор, клиент переставал видеть движение — до тех пор, пока
 * водитель не возвращался в приложение нажать «Я на месте».
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import { resolveCurrentPosition } from '@nurtaxi/shared-core/features/geolocation';

import { useAppDispatch } from '@/app/store/hooks';
import { locationTrackingChanged } from '@/processes/shift';

import { DRIVER_LOCATION_TASK, sendDriverLocationUpdate } from './location-task';

/** `off` — не на линии; `online` — ждёт заказ; `order` — выполняет заказ. */
export type DriverTrackingMode = 'off' | 'online' | 'order';

const TRACKING_OPTIONS: Record<Exclude<DriverTrackingMode, 'off'>, Location.LocationTaskOptions> = {
  /**
   * `High`, а не `Balanced`: на Android «сбалансированный» режим обходится без GPS и
   * ошибается на квартал — подбор считал ближайшей не ту машину.
   */
  online: {
    accuracy: Location.Accuracy.High,
    timeInterval: 10_000,
    distanceInterval: 30,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Nur Taxi',
      notificationBody: 'Передаём вашу позицию, чтобы вы получали заказы рядом',
    },
  },
  /**
   * Навигационная точность и шаг в пару секунд — между точками метку у клиента ведёт
   * анимация, и машина едет по карте без рывков. iOS интервал игнорирует и шлёт по
   * `distanceInterval`; лишнее отсекает `sendDriverLocationUpdate`.
   */
  order: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 5,
    activityType: Location.ActivityType.AutomotiveNavigation,
    // На светофоре и в пробке iOS иначе усыпляет GPS и будит его с опозданием.
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Nur Taxi',
      notificationBody: 'Идёт заказ: клиент видит вашу машину на карте',
    },
  },
};

/**
 * Разрешение «Всегда» нужно для обновлений, когда приложение свёрнуто. Его отсутствие не
 * должно мешать выйти на линию — задача продолжит работать хотя бы на переднем плане.
 *
 * `ask: false` — только проверить, ничего не спрашивая: повторная попытка при возврате в
 * приложение не должна каждый раз поднимать системный диалог.
 */
async function ensurePermissions(ask: boolean): Promise<boolean> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!ask) {
    return foreground.status === Location.PermissionStatus.GRANTED;
  }

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

/** `mode` выводится из серверного `profile.onlineStatus`: `online` → `online`, `busy` → `order`. */
export function useDriverLocationTracking(mode: DriverTrackingMode): void {
  const dispatch = useAppDispatch();
  /** Режим, с которым задача запущена сейчас. Читается и пишется только внутри очереди. */
  const appliedRef = useRef<DriverTrackingMode>('off');

  useEffect(() => {
    let cancelled = false;

    async function start(next: Exclude<DriverTrackingMode, 'off'>, ask: boolean): Promise<void> {
      if (appliedRef.current === next) {
        return;
      }

      const permitted = await ensurePermissions(ask);
      if (!permitted || cancelled) {
        return;
      }

      if (appliedRef.current === 'off') {
        // Не ждём первого фикса от фоновой задачи — шлём последнюю известную точку сразу,
        // чтобы водитель попал в Redis GEO без задержки в `timeInterval`.
        const current = await resolveCurrentPosition({ forceRefresh: true });
        if (current && !cancelled) {
          sendDriverLocationUpdate({ lat: current.lat, lng: current.lng });
        }
        if (cancelled) {
          return;
        }
      }

      // Повторный вызов с тем же именем задачи не создаёт вторую, а меняет её настройки:
      // так `online` переходит в `order` и обратно без остановки передачи.
      await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, TRACKING_OPTIONS[next]);

      appliedRef.current = next;
      dispatch(locationTrackingChanged(true));
    }

    async function stop(): Promise<void> {
      if (appliedRef.current === 'off') {
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

      appliedRef.current = 'off';
      dispatch(locationTrackingChanged(false));
    }

    const apply = (ask: boolean) => enqueue(mode === 'off' ? stop : () => start(mode, ask));
    apply(true);

    /**
     * Android запускает задачу с уведомлением только с переднего плана. Если режим сменился,
     * пока приложение было свёрнуто, запуск отклонён — повторяем при возврате. Когда задача
     * уже в нужном режиме, повтор ничего не делает.
     */
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        apply(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [mode, dispatch]);
}
