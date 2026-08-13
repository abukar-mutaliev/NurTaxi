import type { GeoLocation } from '../../model';

/** Только поля, которые принимает API (`GeoLocationDto`). */
export function toApiGeoLocation(location: GeoLocation & { label?: string | null }): GeoLocation {
  const address = location.address?.trim();

  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
    ...(address ? { address } : {}),
  };
}

/** Одинаковые точка и адрес — повторный `pickupSelected` не должен триггерить ререндер. */
export function isSameGeoLocation(
  left: GeoLocation | null | undefined,
  right: GeoLocation | null | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }

  return (
    left.lat === right.lat &&
    left.lng === right.lng &&
    (left.address ?? '') === (right.address ?? '')
  );
}
