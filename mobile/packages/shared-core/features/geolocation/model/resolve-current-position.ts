/**
 * Разрешение текущих координат: кэш в памяти → last known → свежий GPS.
 * Один in-flight запрос на всё приложение, чтобы не ждать несколько fix подряд.
 */
import * as Location from 'expo-location';

import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

const CACHE_TTL_MS = 60_000;
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
/**
 * Сколько ждём точку по GPS, прежде чем согласиться на точку по сети. В помещении спутников
 * может не быть вовсе — экран не должен ждать их бесконечно.
 */
const PRECISE_FIX_TIMEOUT_MS = 6000;
/** Свежий замер моложе этого повторно не запрашиваем — см. `resolveFreshPosition`. */
const FRESH_FIX_TTL_MS = 15_000;

/**
 * `fresh` — точку только что измерили, а не взяли у системы готовую. «Последняя известная»
 * бывает десятиминутной давности и неизвестной точности: для первого кадра карты годится,
 * для точки подачи — нет.
 */
let cached: { point: GeoPoint; at: number; fresh: boolean } | null = null;
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

function setCache(point: GeoPoint, fresh: boolean): void {
  cached = { point, at: Date.now(), fresh };
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

function readFix(accuracy: Location.Accuracy): Promise<GeoPoint | null> {
  return Location.getCurrentPositionAsync({ accuracy }).then(toPoint, () => null);
}

/**
 * Свежий замер. Сначала просим точку по GPS (`High`): `Balanced` на Android обходится
 * вышками и Wi‑Fi и ошибается на десятки метров — такси подавали к соседнему дому. Если
 * спутники не ответили за `PRECISE_FIX_TIMEOUT_MS`, берём точку по сети: неточная подача
 * лучше никакой. Опоздавший точный ответ всё равно попадает в кэш.
 */
async function readFreshPosition(): Promise<GeoPoint | null> {
  const precise = readFix(Location.Accuracy.High);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PRECISE_FIX_TIMEOUT_MS);
  });

  let point = await Promise.race([precise, timeout]);
  clearTimeout(timer);

  if (!point) {
    void precise.then((late) => {
      if (late) {
        setCache(late, true);
      }
    });
    point = await readFix(Location.Accuracy.Balanced);
  }

  if (point) {
    setCache(point, true);
  }
  return point;
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
      setCache(lastKnown, false);
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

/**
 * Точка, измеренная только что. В отличие от `resolveCurrentPosition`, не довольствуется
 * «последней известной»: возвращает недавний замер из кэша или делает новый.
 *
 * Нужна вторым шагом после быстрого ответа: карта встаёт на место сразу, а точка подачи
 * через пару секунд уточняется по GPS.
 */
export async function resolveFreshPosition(maxAgeMs = FRESH_FIX_TTL_MS): Promise<GeoPoint | null> {
  if (cached?.fresh && Date.now() - cached.at <= maxAgeMs) {
    return cached.point;
  }
  return resolveCurrentPosition({ forceRefresh: true });
}
