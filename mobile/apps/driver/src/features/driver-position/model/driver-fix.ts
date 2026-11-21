/**
 * Отсчёт GPS водителя: точка плюс то, что нужно клиенту, чтобы машина на его карте
 * стояла там же, где на дороге, и смотрела по ходу движения.
 *
 * Чистые функции без зависимостей от Expo — их вызывают и экран заказа, и фоновая задача.
 */
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

export interface DriverFix extends GeoPoint {
  /** Курс, градусы от севера по часовой (0…360). `null` — машина стоит или курс неизвестен. */
  heading: number | null;
  /** Скорость, м/с. */
  speed: number | null;
  /** Радиус погрешности точки, м. */
  accuracy: number | null;
}

/** Координаты в том виде, в каком их отдаёт `expo-location`. */
export interface RawCoords {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
}

/**
 * Медленнее — курсу верить нельзя. На стоянке Android отдаёт `0` («на север»), iOS — `-1`,
 * а на скорости пешехода курс скачет от шума GPS: машина у клиента крутилась бы на месте.
 */
const MIN_HEADING_SPEED_MPS = 1.5;

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function fixFromCoords(coords: RawCoords): DriverFix {
  const rawSpeed = finiteOrNull(coords.speed);
  const speed = rawSpeed != null && rawSpeed >= 0 ? rawSpeed : null;
  const rawHeading = finiteOrNull(coords.heading);
  const rawAccuracy = finiteOrNull(coords.accuracy);

  const headingKnown =
    rawHeading != null && rawHeading >= 0 && speed != null && speed >= MIN_HEADING_SPEED_MPS;

  return {
    accuracy: rawAccuracy != null && rawAccuracy >= 0 ? rawAccuracy : null,
    heading: headingKnown ? rawHeading % 360 : null,
    lat: coords.latitude,
    lng: coords.longitude,
    speed,
  };
}

/** Грубее — это уже не GPS, а вышки и Wi‑Fi: точка может лежать на соседней улице. */
const POOR_ACCURACY_M = 50;
/** Сколько держимся за последнюю точную точку, отбрасывая грубые. */
const GOOD_FIX_TTL_MS = 10_000;

/**
 * Фильтр выбросов. Между точными отсчётами приёмник иногда отдаёт точку по сети с
 * погрешностью в сотни метров — машина на карте клиента прыгала бы на квартал и обратно.
 * Грубую точку пропускаем, пока свежа точная. Если точных нет дольше `GOOD_FIX_TTL_MS`
 * (тоннель, плотная застройка), берём что есть: устаревшая позиция хуже неточной.
 */
export function createFixFilter(): (fix: Pick<DriverFix, 'accuracy'>, nowMs: number) => boolean {
  let lastGoodAt: number | null = null;

  return (fix, nowMs) => {
    const poor = fix.accuracy != null && fix.accuracy > POOR_ACCURACY_M;
    if (!poor) {
      lastGoodAt = nowMs;
      return true;
    }
    return lastGoodAt == null || nowMs - lastGoodAt > GOOD_FIX_TTL_MS;
  };
}
