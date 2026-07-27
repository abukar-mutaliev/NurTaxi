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
