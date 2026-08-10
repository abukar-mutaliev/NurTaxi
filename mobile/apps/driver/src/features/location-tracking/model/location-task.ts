/**
 * Фоновая задача передачи геопозиции водителя (M8.2, Req §15.3).
 *
 * `TaskManager.defineTask` вызывается на верхнем уровне модуля — до монтирования любых
 * компонентов, как того требует `expo-task-manager`, — и подключается сразу при загрузке
 * бандла (`app/_layout.tsx` импортирует этот модуль ради побочного эффекта). Так задача
 * готова получать точки даже если ОС запустила приложение в фоне из-за события геолокации.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { driverApi } from '@nurtaxi/shared-core/entities/driver';
import { realtimeClient } from '@nurtaxi/shared-core/features/realtime';

import { store } from '@/app/store/store';
import { positionSent } from '@/processes/shift';

export const DRIVER_LOCATION_TASK = 'nurtaxi-driver-location-task';

/**
 * Основной канал — WS-событие `driver.location` (мгновенно, без лишнего HTTP round-trip).
 * Если сокет не подключён (например, задача сработала в фоне, где соединение уже разорвано),
 * уходим через REST `PATCH /driver/location` — тот же эндпоинт, что и раньше существовал
 * как декларированный, но не вызываемый фоллбэк.
 */
export function sendDriverLocationUpdate(lat: number, lng: number): void {
  const sentViaSocket = realtimeClient.sendDriverLocation(lat, lng);
  if (!sentViaSocket) {
    void store.dispatch(driverApi.endpoints.updateDriverLocation.initiate({ lat, lng }));
  }
  store.dispatch(positionSent({ lat, lng }));
}

interface LocationTaskPayload {
  locations: Location.LocationObject[];
}

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) {
    return;
  }

  const { locations } = data as LocationTaskPayload;
  const last = locations.at(-1);
  if (!last) {
    return;
  }

  sendDriverLocationUpdate(last.coords.latitude, last.coords.longitude);
});
