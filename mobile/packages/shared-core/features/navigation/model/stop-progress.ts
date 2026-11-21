/**
 * Какие промежуточные остановки машина уже проехала.
 *
 * От ответа зависит, куда ведёт маршрут и навигатор: к следующей остановке или уже дальше.
 * Прежде остановка считалась пройденной за 150 метров до неё — линия и навигатор
 * перескакивали на следующую точку раньше, чем машина доезжала, и водитель не видел, где
 * именно остановиться.
 *
 * Просто уменьшить радиус нельзя: точка остановки — это адрес, то есть нередко дом в
 * полусотне метров от проезжей части, и машина может вообще не попасть в малый круг.
 * Поэтому остановка пройдена в одном из двух случаев:
 *  - машина подъехала вплотную (`STOP_ARRIVED_M`);
 *  - машина была рядом (`STOP_APPROACH_M`) и уже удаляется: отъехала от ближайшей точки
 *    своего пути больше чем на `STOP_DEPART_M`.
 * Пока машина приближается, целью остаётся сама остановка.
 */
import { haversineDistance } from '@nurtaxi/shared-core/shared/lib/geo/polyline';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

/** Вплотную: машина у точки остановки. */
export const STOP_ARRIVED_M = 40;
/** Рядом: с этого расстояния следим, приближается машина или удаляется. */
export const STOP_APPROACH_M = 150;
/** Удаление от ближайшей точки пути. Больше дрожания GPS, меньше квартала. */
export const STOP_DEPART_M = 50;

export interface StopProgress {
  /** Сколько остановок с начала маршрута пройдено. */
  count: number;
  /** Ближе всего к следующей остановке машина была на этом расстоянии; `null` — ещё не рядом. */
  closestM: number | null;
}

export const NO_STOPS_PASSED: StopProgress = { closestM: null, count: 0 };

/**
 * Учитывает новую точку машины. Возвращает тот же объект, если ничего не изменилось, —
 * вызывающий код сравнивает по ссылке и не обновляет состояние зря.
 *
 * За вызов снимается не больше одной остановки: если следующая тоже рядом, её снимет
 * следующий вызов.
 */
export function advanceStopProgress(
  progress: StopProgress,
  origin: GeoPoint,
  stops: readonly GeoPoint[],
): StopProgress {
  const nextStop = stops[progress.count];
  if (!nextStop) {
    return progress;
  }

  const distance = haversineDistance(origin, nextStop);
  const passed = { closestM: null, count: progress.count + 1 };

  if (distance <= STOP_ARRIVED_M) {
    return passed;
  }

  if (progress.closestM == null) {
    return distance <= STOP_APPROACH_M ? { closestM: distance, count: progress.count } : progress;
  }

  if (distance - progress.closestM > STOP_DEPART_M) {
    return passed;
  }

  return distance < progress.closestM ? { closestM: distance, count: progress.count } : progress;
}
