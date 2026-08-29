/**
 * Конфигурация окружения (M0.6).
 *
 * Значения приходят из `app.config.ts` каждого приложения через `expo-constants` → `extra`,
 * который в свою очередь читает переменные `EXPO_PUBLIC_*`. Прямое чтение `process.env` внутри
 * кода приложения запрещено — всё идёт через этот модуль, чтобы один и тот же билд
 * конфигурировался и в dev, и в staging, и в prod.
 */
import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface AppConfigExtra {
  environment: AppEnvironment;
  /** Базовый URL REST API, включая префикс версии. Пример: `http://10.0.2.2:3000/api/v1`. */
  apiUrl: string;
  /** Полный URL namespace Socket.IO. Если не задан — выводится из `apiUrl`. */
  wsUrl?: string;
  /** Таймаут одиночного HTTP-запроса, мс. */
  requestTimeoutMs: number;
  /** Включает подробное логирование сети и Redux. Никогда не включать в production. */
  debugNetwork: boolean;
  /** Публичный ключ MapKit для runtime-инициализации (`initialize`). */
  yandexMapKitApiKey?: string;
  /** Ключ Yandex MapKit вшивается в native-сборку при `eas build` / `expo prebuild`. */
  yandexMapKitApiKeyConfigured: boolean;
}

const DEFAULTS: AppConfigExtra = {
  environment: 'development',
  apiUrl: 'http://localhost:3000/api/v1',
  requestTimeoutMs: 15_000,
  debugNetwork: false,
  yandexMapKitApiKeyConfigured: false,
};

function resolveYandexMapKitApiKey(extra: Partial<AppConfigExtra>): string | undefined {
  const fromExtra = extra.yandexMapKitApiKey?.trim();
  if (fromExtra) {
    return fromExtra;
  }

  // Fallback: Expo подставляет EXPO_PUBLIC_* в JS-бандл даже если extra ещё не обновился.
  const fromPublicEnv = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY?.trim();
  return fromPublicEnv || undefined;
}

function readExtra(): Partial<AppConfigExtra> {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') {
    return {};
  }
  return extra as Partial<AppConfigExtra>;
}

/**
 * Namespace Socket.IO сервера — `/ws` на том же origin, что и REST API
 * (`server/src/modules/realtime/realtime.gateway.ts`).
 */
function deriveWsUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}/ws`;
  } catch {
    return apiUrl.replace(/\/api\/v\d+\/?$/, '') + '/ws';
  }
}

const extra = readExtra();
const yandexMapKitApiKey = resolveYandexMapKitApiKey(extra);

export const appConfig: Readonly<AppConfigExtra> & { wsUrl: string } = Object.freeze({
  ...DEFAULTS,
  ...extra,
  yandexMapKitApiKey,
  yandexMapKitApiKeyConfigured: Boolean(yandexMapKitApiKey),
  wsUrl: extra.wsUrl ?? deriveWsUrl(extra.apiUrl ?? DEFAULTS.apiUrl),
});

export const isDevEnvironment = appConfig.environment === 'development';
export const isProdEnvironment = appConfig.environment === 'production';

/** Origin API без префикса версии — нужен для presigned-загрузок и внешних ссылок. */
export function getApiOrigin(): string {
  try {
    const url = new URL(appConfig.apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return appConfig.apiUrl;
  }
}
