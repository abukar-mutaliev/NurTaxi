import { haversineDistance } from '@nurtaxi/shared-core/shared/lib';
import type { GeoLocation, GeoPoint } from '@nurtaxi/shared-core/shared/model';

/** Точка подачи выставлена автоматически по GPS, а не выбрана вручную. */
export function isAutoPickupLocation(pickup: GeoLocation, myLocationLabel: string): boolean {
  return pickup.address === myLocationLabel;
}

/** Обновляем координаты «Моё местоположение», когда GPS сдвинулся заметнее порога. */
export function shouldSyncAutoPickup(
  pickup: GeoPoint,
  position: GeoPoint,
  thresholdMeters = 8,
): boolean {
  return haversineDistance(pickup, position) > thresholdMeters;
}

/** Короче этого сдвиг GPS-метки считаем зумом, а не новым местом подачи. */
const MIN_PICKUP_MOVE_M = 8;

export interface PickupCameraDecision {
  /** Пока `true`, кадр можно вести за GPS. На время жеста — `false`, чтобы геолокация не вырывала карту. */
  followGps: boolean;
  /** Новая точка подачи. `null` — черновик не менять. */
  pickup: GeoLocation | null;
}

/**
 * Метка подачи стоит в центре карты. Жест сдвигает точку, куда приедет такси.
 * Пока подача ещё «Моё местоположение», короткий сдвиг не отрывает её от GPS.
 * Точку, выбранную вручную, двигает любой завершённый жест.
 */
export function decidePickupFromCamera(options: {
  finished: boolean;
  current: GeoLocation | null;
  next: GeoPoint;
  myLocationLabel: string;
  mapPointAddress: string;
  minMoveMeters?: number;
}): PickupCameraDecision {
  if (!options.finished) {
    return { followGps: false, pickup: null };
  }

  const current = options.current;
  const placedByHand = current != null && !isAutoPickupLocation(current, options.myLocationLabel);
  const movedFar =
    current == null ||
    haversineDistance(current, options.next) >= (options.minMoveMeters ?? MIN_PICKUP_MOVE_M);

  if (!placedByHand && !movedFar) {
    return { followGps: true, pickup: null };
  }

  return {
    followGps: false,
    pickup: {
      lat: options.next.lat,
      lng: options.next.lng,
      address: options.mapPointAddress,
    },
  };
}
