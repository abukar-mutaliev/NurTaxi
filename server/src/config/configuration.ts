/**
 * Централизованная типизированная конфигурация приложения.
 * Значения читаются из окружения; в staging/prod часть секретов подгружается
 * из Vault (см. SECRETS_PROVIDER) — этот слой скрывает источник от остального кода.
 */

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export interface AppConfig {
  env: string;
  name: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  runMigrations: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls: boolean;
  tlsRejectUnauthorized: boolean;
}

export interface NatsConfig {
  url: string;
}

export interface S3Config {
  endpoint: string;
  /** Адрес S3 для presigned URL, доступный с мобильных устройств (LAN IP в dev). */
  publicEndpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: number;
  refreshTtl: number;
}

export interface SecretsConfig {
  provider: 'env' | 'vault';
  vaultAddr?: string;
  vaultToken?: string;
  vaultSecretPath?: string;
}

export interface ObservabilityConfig {
  logLevel: string;
  logPretty: boolean;
  otelEnabled: boolean;
  otelEndpoint: string;
  otelServiceName: string;
}

export type MapProviderKind = 'stub' | 'yandex';

export type RoutingProviderKind = 'stub' | 'osrm';

export interface MapsConfig {
  provider: MapProviderKind;
  /** Ключ API Геосаджеста (автодополнение адресов). */
  yandexGeosuggestApiKey: string;
  /** Ключ API Геокодера (координаты по uri/адресу). */
  yandexGeocoderApiKey: string;
  geosuggestUrl: string;
  geocoderUrl: string;
  locale: string;
  /** Устарело: географическая рамка больше не передаётся в Яндекс. */
  searchBbox?: string;
  requestTimeoutMs: number;
}

export interface RoutingConfig {
  provider: RoutingProviderKind;
  /** Базовый URL OSRM, например http://localhost:5000 */
  osrmBaseUrl: string;
  requestTimeoutMs: number;
  /** При ошибке OSRM вернуться к прямой линии (stub). */
  fallbackToStub: boolean;
}

export type SmsProviderKind = 'stub' | 'smsaero';

export interface SmsConfig {
  /** `smsaero`, когда заданы почта и API-ключ. Иначе заглушка (код только в логе). */
  provider: SmsProviderKind;
  email: string;
  apiKey: string;
  /** Имя отправителя. Для тестового ключа SMS Aero допустимо `SMS Aero`. */
  sign: string;
  baseUrl: string;
  timeoutMs: number;
  /**
   * Вход через Mobile ID SMS Aero (SIM-push, затем SMS-код).
   * Включается, когда есть ключ, секрет вебхука и публичный адрес API.
   */
  mobileId: boolean;
  /** Полный URL, который SMS Aero вызывает при смене статуса. Включает секрет. */
  callbackUrl: string;
  callbackSecret: string;
  /** Тестовый ключ SMS Aero: SMS не уходят, код Mobile ID всегда 1234. */
  testMode: boolean;
  /** Сколько ждать финальный статус после ввода SMS-кода, мс. */
  verifyWaitMs: number;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  nats: NatsConfig;
  s3: S3Config;
  jwt: JwtConfig;
  secrets: SecretsConfig;
  observability: ObservabilityConfig;
  maps: MapsConfig;
  routing: RoutingConfig;
  sms: SmsConfig;
}

export default (): Configuration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    name: process.env.APP_NAME ?? 'nurtaxi-backend',
    port: toInt(process.env.PORT, 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigins: process.env.CORS_ORIGINS ?? '',
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    username: process.env.DB_USERNAME ?? 'nurtaxi',
    password: process.env.DB_PASSWORD ?? 'nurtaxi',
    database: process.env.DB_DATABASE ?? 'nurtaxi',
    ssl: toBool(process.env.DB_SSL),
    sslRejectUnauthorized: toBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
    runMigrations: toBool(process.env.DB_RUN_MIGRATIONS),
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: toBool(process.env.REDIS_TLS),
    tlsRejectUnauthorized: toBool(process.env.REDIS_TLS_REJECT_UNAUTHORIZED, true),
  },
  nats: {
    url: process.env.NATS_URL ?? 'nats://localhost:4222',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    publicEndpoint:
      process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'ru-central-1',
    accessKey: process.env.S3_ACCESS_KEY ?? 'nurtaxi',
    secretKey: process.env.S3_SECRET_KEY ?? 'nurtaxi123',
    bucket: process.env.S3_BUCKET ?? 'nurtaxi-documents',
    forcePathStyle: toBool(process.env.S3_FORCE_PATH_STYLE, true),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    accessTtl: toInt(process.env.JWT_ACCESS_TTL, 900),
    refreshTtl: toInt(process.env.JWT_REFRESH_TTL, 2592000),
  },
  secrets: {
    provider: (process.env.SECRETS_PROVIDER as SecretsConfig['provider']) ?? 'env',
    vaultAddr: process.env.VAULT_ADDR || undefined,
    vaultToken: process.env.VAULT_TOKEN || undefined,
    vaultSecretPath: process.env.VAULT_SECRET_PATH || undefined,
  },
  observability: {
    logLevel: process.env.LOG_LEVEL ?? 'info',
    logPretty: toBool(process.env.LOG_PRETTY, false),
    otelEnabled: toBool(process.env.OTEL_ENABLED),
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318',
    otelServiceName: process.env.OTEL_SERVICE_NAME ?? 'nurtaxi-backend',
  },
  maps: {
    provider: (process.env.MAP_PROVIDER as MapsConfig['provider']) ?? 'stub',
    yandexGeosuggestApiKey: process.env.YANDEX_GEOSUGGEST_API_KEY ?? '',
    yandexGeocoderApiKey: process.env.YANDEX_GEOCODER_API_KEY ?? '',
    geosuggestUrl: process.env.YANDEX_GEOSUGGEST_URL ?? 'https://suggest-maps.yandex.ru/v1/suggest',
    geocoderUrl: process.env.YANDEX_GEOCODER_URL ?? 'https://geocode-maps.yandex.ru/v1/',
    locale: process.env.YANDEX_MAPS_LOCALE ?? 'ru_RU',
    searchBbox: process.env.YANDEX_SEARCH_BBOX || undefined,
    requestTimeoutMs: toInt(process.env.YANDEX_MAPS_TIMEOUT_MS, 8000),
  },
  routing: {
    provider: (process.env.MAP_ROUTING_PROVIDER as RoutingConfig['provider']) ?? 'osrm',
    osrmBaseUrl: process.env.OSRM_BASE_URL ?? 'http://localhost:5001',
    requestTimeoutMs: toInt(process.env.OSRM_TIMEOUT_MS, 8000),
    fallbackToStub: toBool(process.env.OSRM_FALLBACK_TO_STUB, true),
  },
  sms: readSmsConfig(),
});

function readSmsConfig(): SmsConfig {
  const email = (process.env.SMSAERO_EMAIL ?? '').trim();
  const apiKey = (process.env.SMSAERO_API_KEY ?? '').trim();
  const sign = (process.env.SMSAERO_SIGN ?? '').trim() || 'SMS Aero';
  const callbackSecret = (process.env.SMSAERO_CALLBACK_SECRET ?? '').trim();
  const callbackUrl = buildMobileIdCallbackUrl(callbackSecret);
  const hasCredentials = Boolean(email && apiKey);
  const mobileIdRequested = process.env.SMSAERO_MOBILE_ID !== 'false';

  return {
    provider: hasCredentials ? 'smsaero' : 'stub',
    email,
    apiKey,
    sign,
    baseUrl: (process.env.SMSAERO_BASE_URL ?? 'https://gate.smsaero.ru/v2').replace(/\/$/, ''),
    timeoutMs: toInt(process.env.SMSAERO_TIMEOUT_MS, 10_000),
    // localhost и http SMS Aero отклоняет как Validation error, поэтому Mobile ID
    // включается только с публичным https. Иначе код уходит обычным SMS.
    mobileId:
      hasCredentials &&
      mobileIdRequested &&
      Boolean(callbackSecret) &&
      isPublicHttpsUrl(callbackUrl),
    callbackUrl,
    callbackSecret,
    testMode: toBool(process.env.SMSAERO_TEST_MODE),
    verifyWaitMs: toInt(process.env.SMSAERO_VERIFY_WAIT_MS, 5_000),
  };
}

/**
 * SMS Aero принимает callback только как публичный https с доменом.
 * `http://localhost` и адрес без точки в хосте дают 400 Validation error.
 */
export function isPublicHttpsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost'))
      return false;
    if (!host.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

/** URL вебхука Mobile ID. Секрет в query: SMS Aero присылает его обратно как есть. */
function buildMobileIdCallbackUrl(secret: string): string {
  const explicit = (process.env.SMSAERO_CALLBACK_URL ?? '').trim();
  const publicApi = (process.env.PUBLIC_API_URL ?? '').trim();
  const prefix = (process.env.API_PREFIX ?? 'api/v1').replace(/^\/|\/$/g, '');
  return resolveMobileIdCallbackUrl({ explicit, publicApi, apiPrefix: prefix, secret });
}

export function resolveMobileIdCallbackUrl(input: {
  explicit?: string;
  publicApi?: string;
  apiPrefix?: string;
  secret?: string;
}): string {
  const explicit = (input.explicit ?? '').trim();
  const publicApi = (input.publicApi ?? '').trim().replace(/\/$/, '');
  const prefix = (input.apiPrefix ?? 'api/v1').replace(/^\/|\/$/g, '');
  const base =
    explicit ||
    (publicApi
      ? publicApi.endsWith(`/${prefix}`)
        ? `${publicApi}/auth/mobile-id/callback`
        : `${publicApi}/${prefix}/auth/mobile-id/callback`
      : '');
  if (!base) return '';
  const secret = (input.secret ?? '').trim();
  if (!secret || /[?&]token=/.test(base)) return base;
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}token=${encodeURIComponent(secret)}`;
}
