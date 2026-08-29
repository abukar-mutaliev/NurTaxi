import { decodePolyline, haversineDistance } from '../../../shared/lib';
import type { GeoLocation, GeoPoint } from '../../../shared/model';
import type { MapMarker } from '../ui/map-canvas';
import { isValidGeoPoint, normalizeGeoPoint } from './map-provider';

const OVERLAP_THRESHOLD_M = 25;
/** ~15 м на широте 43° — чтобы A и B не слипались в один пин. */
const OVERLAP_OFFSET = 0.00014;

function offsetOverlappingDropoff(pickup: GeoPoint, dropoff: GeoPoint): GeoPoint {
  if (haversineDistance(pickup, dropoff) >= OVERLAP_THRESHOLD_M) {
    return dropoff;
  }

  return {
    lat: dropoff.lat + OVERLAP_OFFSET,
    lng: dropoff.lng + OVERLAP_OFFSET,
  };
}

function dropoffPointFromRoute(routePolyline: string | null | undefined): GeoPoint | null {
  if (!routePolyline) {
    return null;
  }

  const points = decodePolyline(routePolyline);
  const last = points[points.length - 1];

  return last && isValidGeoPoint(last) ? normalizeGeoPoint(last) : null;
}

/** Маркеры A/B (и водитель, если есть): нормализация координат, fallback из polyline, разведение при наложении. */
export function resolveOrderMapMarkers(options: {
  pickup: GeoLocation | null;
  dropoff: GeoLocation | null;
  routePolyline?: string | null;
  driver?: GeoPoint | null;
}): MapMarker[] {
  const { pickup, dropoff, routePolyline, driver } = options;
  const items: MapMarker[] = [];

  const pickupPoint = pickup && isValidGeoPoint(pickup) ? normalizeGeoPoint(pickup) : null;
  let dropoffPoint =
    dropoff && isValidGeoPoint(dropoff)
      ? normalizeGeoPoint(dropoff)
      : dropoffPointFromRoute(routePolyline);

  if (pickupPoint && dropoffPoint) {
    dropoffPoint = offsetOverlappingDropoff(pickupPoint, dropoffPoint);
  }

  if (pickupPoint) {
    items.push({
      id: 'pickup',
      kind: 'pickup',
      point: pickupPoint,
      title: pickup?.address,
    });
  }

  if (dropoffPoint) {
    items.push({
      id: 'dropoff',
      kind: 'dropoff',
      point: dropoffPoint,
      title: dropoff?.address,
    });
  }

  if (driver && isValidGeoPoint(driver)) {
    items.push({
      id: 'driver',
      kind: 'driver',
      point: normalizeGeoPoint(driver),
    });
  }

  return items;
}
