/**
 * Доступ к геосервисам Yandex MapKit: подсказки адресов, геокодинг и построение маршрута.
 *
 * Модули Suggest / Search / Transport есть только в сборке MapKit с `flavor: 'full'`
 * (см. `app.config.ts`). На `lite` они зарегистрированы, но каждый вызов отклоняется с
 * «requires the full flavor», а в Expo Go нативного модуля нет вовсе. Поэтому все функции
 * здесь возвращают `null` вместо исключения — вызывающий код переключается на серверный
 * `/geo/search`, а не падает.
 */
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

type YandexMapKit = typeof import('expo-yandex-mapkit');
type SuggestItem = Awaited<ReturnType<YandexMapKit['suggest']>>[number];

/** Подсказка адреса. Координата приходит не всегда — её дорезолвит `resolveSuggestionPoint`. */
export interface YandexSuggestion {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  point: GeoPoint | null;
  /** Непрозрачный идентификатор объекта MapKit — по нему можно дозапросить координату. */
  uri: string | null;
}

export interface YandexRoute {
  points: GeoPoint[];
  /** Длина маршрута в метрах — MapKit отдаёт её только для автомобильных маршрутов. */
  distanceM: number | null;
  /** Готовая к показу длительность, например «23 мин». */
  duration: string | null;
  /** Длительность с учётом пробок, если MapKit её посчитал. */
  durationWithTraffic: string | null;
}

/**
 * Библиотека дёргает `requireNativeModule` на верхнем уровне, поэтому голый `import`
 * уронит бандл в окружении без нативного модуля. Грузим лениво и один раз.
 */
let cachedModule: YandexMapKit | null | undefined;

function loadYandex(): YandexMapKit | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module
    cachedModule = require('expo-yandex-mapkit') as YandexMapKit;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/**
 * Сборка оказалась `lite`. Проверить это заранее нельзя — флавор виден только по отказу
 * первого вызова, поэтому запоминаем его и больше не ходим в нативный модуль.
 */
let fullFlavorUnavailable = false;

function isFullFlavorRejection(cause: unknown): boolean {
  return cause instanceof Error && /full flavor/i.test(cause.message);
}

/** Нативный модуль в принципе доступен: есть смысл пробовать Yandex до первого отказа. */
export function isYandexGeoAvailable(): boolean {
  return !fullFlavorUnavailable && loadYandex() !== null;
}

function toGeoPoint(point: { latitude: number; longitude: number } | undefined): GeoPoint | null {
  if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    return null;
  }
  return { lat: point.latitude, lng: point.longitude };
}

function toMapPoint(point: GeoPoint) {
  return { latitude: point.lat, longitude: point.lng };
}

/**
 * Один вызов нативного модуля с единой обработкой отказов: `null` означает «Yandex здесь
 * не работает», и вызывающий код уходит на серверный источник.
 */
async function callYandex<T>(action: (sdk: YandexMapKit) => Promise<T>): Promise<T | null> {
  const sdk = loadYandex();
  if (!sdk || fullFlavorUnavailable) {
    return null;
  }

  try {
    return await action(sdk);
  } catch (cause) {
    if (isFullFlavorRejection(cause)) {
      fullFlavorUnavailable = true;
      return null;
    }
    // Сетевые сбои и пустые ответы MapKit не должны ронять экран.
    console.warn('[yandex-geo] запрос не выполнен', cause);
    return null;
  }
}

function toSuggestion(item: SuggestItem, index: number): YandexSuggestion {
  const address = item.searchText || item.title;
  return {
    address,
    id: item.uri ?? `${address}:${index}`,
    point: toGeoPoint(item.center),
    subtitle: item.subtitle ?? '',
    title: item.title,
    uri: item.uri ?? null,
  };
}

export interface SuggestAddressesOptions {
  /** Точка отсчёта — подсказки рядом с ней идут выше. */
  near?: GeoPoint | null;
  limit?: number;
}

/** Подсказки при наборе. `null` — Yandex недоступен, нужен серверный источник. */
export async function suggestAddresses(
  query: string,
  { near, limit = 6 }: SuggestAddressesOptions = {},
): Promise<YandexSuggestion[] | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const items = await callYandex((sdk) =>
    sdk.suggest(trimmed, {
      types: ['geo', 'biz'],
      ...(near ? { userPosition: toMapPoint(near) } : {}),
    }),
  );

  return items ? items.slice(0, limit).map(toSuggestion) : null;
}

/**
 * Координата выбранной подсказки. MapKit отдаёт `center` не для каждого объекта, поэтому
 * при его отсутствии дорезолвим по `uri`, а в крайнем случае — обычным поиском по тексту.
 */
export async function resolveSuggestionPoint(
  suggestion: YandexSuggestion,
): Promise<GeoPoint | null> {
  if (suggestion.point) {
    return suggestion.point;
  }

  if (suggestion.uri) {
    const byUri = await callYandex((sdk) => sdk.resolveURI(suggestion.uri as string));
    const point = toGeoPoint(byUri?.[0]?.point);
    if (point) {
      return point;
    }
  }

  const byText = await callYandex((sdk) =>
    sdk.geocodeAddress(suggestion.address, { resultPageSize: 1 }),
  );
  return toGeoPoint(byText?.[0]?.point);
}

/** Адрес по координатам (обратный геокодинг). `null` — Yandex недоступен или ничего не нашёл. */
export async function reverseGeocode(point: GeoPoint): Promise<string | null> {
  const results = await callYandex((sdk) =>
    sdk.geocodePoint(toMapPoint(point), { resultPageSize: 1 }),
  );
  const first = results?.[0];
  return first?.formattedAddress ?? first?.name ?? null;
}

/**
 * Автомобильный маршрут через все переданные точки по порядку. MapKit возвращает несколько
 * вариантов — берём первый, он же оптимальный по версии Яндекса.
 */
export async function buildDrivingRoute(points: GeoPoint[]): Promise<YandexRoute | null> {
  if (points.length < 2) {
    return null;
  }

  const routes = await callYandex((sdk) => sdk.findDrivingRoutes(points.map(toMapPoint)));
  const route = routes?.[0];
  if (!route || route.points.length < 2) {
    return null;
  }

  return {
    distanceM: route.distance ?? null,
    duration: route.time ?? null,
    durationWithTraffic: route.timeWithTraffic ?? null,
    points: route.points
      .map((point) => toGeoPoint(point))
      .filter((point): point is GeoPoint => point !== null),
  };
}
