import type { GeoPoint } from '../../../shared/model';

import type { CameraPosition } from './map-provider';

const WORLD_SIZE_AT_ZOOM_0 = 256;
const MAX_LATITUDE = 85.05112878;

export interface ScreenSize {
  height: number;
  width: number;
}

export interface ScreenOffset {
  x: number;
  y: number;
}

function mercator(lat: number, lng: number, zoom: number): ScreenOffset {
  const scale = WORLD_SIZE_AT_ZOOM_0 * 2 ** zoom;
  const clampedLat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
  const sin = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/**
 * Экранная точка маркера в логических пикселях RN. Считается синхронно по камере,
 * чтобы машинка не отставала от жеста зума (в отличие от async `getScreenPoints`).
 *
 * MapKit `worldToScreen` работает в физических пикселях окна (`256 * 2^zoom` на экваторе),
 * поэтому смещение делим на `pixelRatio`.
 */
export function projectGeoToScreen(
  point: GeoPoint,
  camera: CameraPosition,
  mapSize: ScreenSize,
  pixelRatio = 1,
): ScreenOffset | null {
  if (mapSize.width <= 0 || mapSize.height <= 0 || pixelRatio <= 0) {
    return null;
  }

  const world = mercator(point.lat, point.lng, camera.zoom);
  const center = mercator(camera.latitude, camera.longitude, camera.zoom);
  let dx = world.x - center.x;
  let dy = world.y - center.y;

  const azimuthRad = ((camera.azimuth ?? 0) * Math.PI) / 180;
  if (azimuthRad !== 0) {
    const cos = Math.cos(-azimuthRad);
    const sin = Math.sin(-azimuthRad);
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;
    dx = rotatedX;
    dy = rotatedY;
  }

  return {
    x: mapSize.width / 2 + dx / pixelRatio,
    y: mapSize.height / 2 + dy / pixelRatio,
  };
}
