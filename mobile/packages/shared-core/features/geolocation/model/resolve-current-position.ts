/**
 * Разрешение текущих координат: кэш в памяти → last known → свежий GPS.
 * Один in-flight запрос на всё приложение, чтобы не ждать несколько fix подряд.
 */
import * as Location from 'expo-location';

import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

const CACHE_TTL_MS = 60_000;
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;

let cached: { point: GeoPoint; at: number } | null = null;
let inflight: Promise<GeoPoint | null> | null = null;

function toPoint(location: Location.LocationObject): GeoPoint {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
}

export function getCachedCurrentPosition(maxAgeMs = CACHE_TTL_MS): GeoPoint | null {
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.at > maxAgeMs) {
    return null;
  }

  return cached.point;
}

function setCache(point: GeoPoint): void {
  cached = { point, at: Date.now() };
}

async function readLastKnown(): Promise<GeoPoint | null> {
  try {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (!lastKnown) {
      return null;
    }

    if (Date.now() - lastKnown.timestamp > LAST_KNOWN_MAX_AGE_MS) {
      return null;
    }

    return toPoint(lastKnown);
  } catch {
    return null;
  }
}

async function readFreshPosition(): Promise<GeoPoint | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const point = toPoint(location);
    setCache(point);
    return point;
  } catch {
    return null;
  }
}

export interface ResolveCurrentPositionOptions {
  /** Пропустить кэш и last known, запросить новый GPS fix. */
  forceRefresh?: boolean;
}

export async function resolveCurrentPosition(
  options?: ResolveCurrentPositionOptions,
): Promise<GeoPoint | null> {
  if (!options?.forceRefresh) {
    const fromCache = getCachedCurrentPosition();
    if (fromCache) {
      return fromCache;
    }

    const lastKnown = await readLastKnown();
    if (lastKnown) {
      setCache(lastKnown);
      return lastKnown;
    }
  }

  if (inflight) {
    return inflight;
  }

  inflight = readFreshPosition().finally(() => {
    inflight = null;
  });

  return inflight;
}
