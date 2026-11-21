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
import { AppState } from 'react-native';

import { driverApi } from '@nurtaxi/shared-core/entities/driver';
import { realtimeClient } from '@nurtaxi/shared-core/features/realtime';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

import { persistor, store } from '@/app/store/store';
import { createFixFilter, fixFromCoords, type DriverFix } from '@/features/driver-position';
import { positionSent } from '@/processes/shift';

export const DRIVER_LOCATION_TASK = 'nurtaxi-driver-location-task';

/** Точка для отправки: курс, скорость и погрешность есть не у каждого источника. */
export type DriverLocationFix = GeoPoint &
  Partial<Pick<DriverFix, 'heading' | 'speed' | 'accuracy'>>;

export interface DriverLocationExtras {
  /** Строка «до клиента». `undefined` — не менять, `null` — подача закончилась. */
  eta?: string | null;
  /** Линия подачи. `undefined` — не менять, `null` — линия больше не нужна. */
  route?: string | null;
}

/**
 * Чаще слать незачем: клиент всё равно ведёт метку анимацией между точками, а сервер на
 * каждую точку обращается к базе. На экране заказа работают сразу два источника — слежение
 * экрана и фоновая задача, — и без этого порога каждая точка уходила бы дважды.
 */
const MIN_SEND_GAP_MS = 1000;
/** HTTP-запрос тяжелее сообщения в сокет — запасным путём шлём реже. */
const MIN_REST_GAP_MS = 3000;
/** Запись на диск в фоне: отметке «приложение живо» секундная точность не нужна. */
const MIN_FLUSH_GAP_MS = 15_000;

let lastSentAt = 0;
let lastRestAt = 0;
let lastFlushAt = 0;

/**
 * Основной канал — WS-событие `driver.location` (мгновенно, без лишнего HTTP round-trip).
 * Если сокет не подключён или перестал отвечать (задача сработала в фоне, где соединение
 * уже разорвано), уходим через REST `PATCH /driver/location`. REST принимает только
 * координаты: лишние поля сервер прежней версии отклонил бы целиком.
 */
export function sendDriverLocationUpdate(
  fix: DriverLocationFix,
  extras: DriverLocationExtras = {},
): void {
  const now = Date.now();
  // Линию и её снятие не придерживаем: они уходят редко и клиенту нужны сразу.
  const urgent = extras.route !== undefined;
  if (!urgent && now - lastSentAt < MIN_SEND_GAP_MS) {
    return;
  }
  lastSentAt = now;

  const { lat, lng } = fix;
  const sentViaSocket = realtimeClient.sendDriverLocation({
    accuracy: fix.accuracy,
    eta: extras.eta,
    heading: fix.heading,
    lat,
    lng,
    route: extras.route,
    speed: fix.speed,
  });
  if (!sentViaSocket && now - lastRestAt >= MIN_REST_GAP_MS) {
    lastRestAt = now;
    void store.dispatch(driverApi.endpoints.updateDriverLocation.initiate({ lat, lng }));
  }
  store.dispatch(positionSent({ lat, lng }));
  // В фоне таймер redux-persist стоит — без явной записи отметка «приложение живо» не
  // дошла бы до диска, и выгрузка системой снимала бы водителя с линии (см. `useOfflineOnLaunch`).
  if (AppState.currentState !== 'active' && now - lastFlushAt >= MIN_FLUSH_GAP_MS) {
    lastFlushAt = now;
    void persistor.flush().catch(() => undefined);
  }
}

interface LocationTaskPayload {
  locations: Location.LocationObject[];
}

const acceptFix = createFixFilter();

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) {
    return;
  }

  const { locations } = data as LocationTaskPayload;
  const last = locations.at(-1);
  if (!last) {
    return;
  }

  const fix = fixFromCoords(last.coords);
  // Точка по вышкам между точными отсчётами GPS — выброс, клиенту её показывать нельзя.
  if (!acceptFix(fix, Date.now())) {
    return;
  }
  sendDriverLocationUpdate(fix);
});
