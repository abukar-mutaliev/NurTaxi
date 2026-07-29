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
