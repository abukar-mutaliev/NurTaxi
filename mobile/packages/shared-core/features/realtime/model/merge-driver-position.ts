/**
 * Как новая точка водителя ложится поверх уже известной.
 *
 * Вынесено из слайса: логику можно проверить без Redux Toolkit, а редьюсер только пишет
 * результат в стор.
 */
import type { DriverLocationEvent } from './realtime-events';

export interface DriverPosition {
  lat: number;
  lng: number;
  at: string;
  /** Та же строка, что на плитке «До клиента» у водителя. */
  eta?: string | null;
  /** Улицы, по которым водитель едет к клиенту. */
  route?: string | null;
  /**
   * Курс машины по GPS, градусы от севера. `null` — в последней точке его не было
   * (машина стоит, старое приложение водителя, точка пришла запасным путём).
   */
  heading?: number | null;
}

function isOlderThan(candidateAt: string, knownAt: string): boolean {
  const candidate = Date.parse(candidateAt);
  const known = Date.parse(knownAt);
  if (!Number.isFinite(candidate) || !Number.isFinite(known)) {
    return false;
  }
  return candidate < known;
}

/**
 * `null` — точку не применять (устарела или это повтор). Иначе — новое значение для стора.
 */
export function mergeDriverPosition(
  previous: DriverPosition | undefined,
  event: Pick<DriverLocationEvent, 'lat' | 'lng' | 'at' | 'eta' | 'route' | 'heading'>,
): DriverPosition | null {
  const { lat, lng, at, eta, route, heading } = event;

  /**
   * Точка уходит и по сокету, и запасным REST: HTTP часто приходит позже свежего
   * сокетного тика. Без сравнения по времени машина на карте прыгала бы назад.
   * Тот же отсев ловит и повтор одного события.
   */
  if (previous && isOlderThan(at, previous.at)) {
    return null;
  }
  if (previous && previous.at === at && previous.lat === lat && previous.lng === lng) {
    return null;
  }

  return {
    at,
    eta: eta === undefined ? previous?.eta : eta,
    // Курс, в отличие от линии и времени, прошлым значением не подменяем: устаревший
    // курс развернул бы машину не туда, а без него направление берётся из смещения точки.
    heading: typeof heading === 'number' && Number.isFinite(heading) ? heading : null,
    lat,
    lng,
    route: route === undefined ? previous?.route : route,
  };
}
