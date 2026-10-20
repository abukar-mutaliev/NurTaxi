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

export interface NearbyMapDriver {
  id: string;
  lat: number;
  lng: number;
}

/** Маркеры A/B, остановки между ними, назначенный водитель и свободные машины рядом. */
export function resolveOrderMapMarkers(options: {
  pickup: GeoLocation | null;
  dropoff: GeoLocation | null;
  /** Промежуточные остановки по порядку. */
  stops?: GeoLocation[] | null;
  routePolyline?: string | null;
  driver?: GeoPoint | null;
  /** Свободные машины вокруг точки. Назначенного водителя сюда не кладём — он приходит отдельно. */
  nearbyDrivers?: NearbyMapDriver[] | null;
  assignedDriverId?: string | null;
}): MapMarker[] {
  const { pickup, dropoff, stops, routePolyline, driver, nearbyDrivers, assignedDriverId } =
    options;
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

  (stops ?? []).forEach((stop, index) => {
    if (!isValidGeoPoint(stop)) {
      return;
    }
    items.push({
      id: `stop-${index}`,
      kind: 'stop',
      point: normalizeGeoPoint(stop),
      title: stop.address,
    });
  });

  if (dropoffPoint) {
    items.push({
      id: 'dropoff',
      kind: 'dropoff',
      point: dropoffPoint,
      title: dropoff?.address,
    });
  }

  const driverPoint = driver && isValidGeoPoint(driver) ? normalizeGeoPoint(driver) : null;

  if (driverPoint) {
    items.push({
      id: 'driver',
      kind: 'driver',
      point: driverPoint,
    });
  }

  for (const nearby of nearbyDrivers ?? []) {
    if (assignedDriverId && nearby.id === assignedDriverId) {
      continue;
    }
    if (!isValidGeoPoint(nearby)) {
      continue;
    }

    const point = normalizeGeoPoint(nearby);
    if (driverPoint && haversineDistance(driverPoint, point) < OVERLAP_THRESHOLD_M) {
      continue;
    }

    items.push({
      id: `nearby-${nearby.id}`,
      kind: 'driver',
      point,
    });
  }

  return items;
}
