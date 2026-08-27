import type { GeoLocation } from '../../model';
import { isPlaceholderAddress } from './is-placeholder-address';

/** Только поля, которые принимает API (`GeoLocationDto`). */
export function toApiGeoLocation(location: GeoLocation & { label?: string | null }): GeoLocation {
  const address = location.address?.trim();

  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
    ...(address ? { address } : {}),
  };
}

/**
 * Для создания заказа: в API уходит улица, а не GPS-подпись.
 * Если улицу так и не получили — координаты без `address`, чтобы старый
 * бэкенд не записал в БД «Моё местоположение».
 */
export function toStoredGeoLocation(
  location: GeoLocation,
  resolvedAddress?: string | null,
): GeoLocation {
  const resolved = resolvedAddress?.trim();
  if (resolved && !isPlaceholderAddress(resolved)) {
    return toApiGeoLocation({ ...location, address: resolved });
  }

  if (isPlaceholderAddress(location.address)) {
    return { lat: Number(location.lat), lng: Number(location.lng) };
  }

  return toApiGeoLocation(location);
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
