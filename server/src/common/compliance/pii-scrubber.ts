/**
 * Вычистка персональных данных из телеметрии и логов (FZ-02.1, FZ-02.6).
 */

const PHONE_RE = /(?:\+?7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PLATE_RE = /\b[АВЕКМНОРСТУХABEKMHOPCTYX]\d{3}[АВЕКМНОРСТУХABEKMHOPCTYX]{2}\d{2,3}\b/gi;
const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
const COORD_RE = /\b-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g;
const PASSPORT_RE = /\b\d{4}\s?\d{6}\b/g;
const INN_RE = /\b\d{10}(\d{2})?\b/g;

const SENSITIVE_KEYS = new Set([
  'phone',
  'fullName',
  'full_name',
  'name',
  'firstName',
  'lastName',
  'patronymic',
  'residenceAddress',
  'residence_address',
  'address',
  'pickupAddress',
  'dropoffAddress',
  'birthDate',
  'birth_date',
  'password',
  'otp',
  'code',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
  'cookie',
  'plateNumber',
  'plate_number',
  'vin',
  'inn',
  'ogrn',
  'number',
  'permitNumber',
  'documentNumber',
  'lat',
  'lng',
  'pickupLat',
  'pickupLng',
  'dropoffLat',
  'dropoffLng',
  'userId',
  'clientId',
  'driverId',
  'body',
  'query',
]);

export const REDACTED = '[REDACTED]';

export function scrubString(value: string): string {
  return value
    .replace(PHONE_RE, REDACTED)
    .replace(EMAIL_RE, REDACTED)
    .replace(PLATE_RE, REDACTED)
    .replace(VIN_RE, REDACTED)
    .replace(COORD_RE, REDACTED)
    .replace(PASSPORT_RE, REDACTED)
    .replace(INN_RE, REDACTED);
}

export function scrubValue(value: unknown, key?: string): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (key && SENSITIVE_KEYS.has(key)) return REDACTED;
    return scrubString(value);
  }
  if (typeof value === 'number') {
    if (key && SENSITIVE_KEYS.has(key)) return REDACTED;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, key));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = SENSITIVE_KEYS.has(k) ? REDACTED : scrubValue(v, k);
    }
    return result;
  }
  return value;
}

/** Вычищает request/user/extra из события ошибки перед логированием. */
export function scrubErrorEvent(event: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(event);
  if (clone.request && typeof clone.request === 'object') {
    const request = clone.request as Record<string, unknown>;
    delete request.data;
    delete request.cookies;
    if (typeof request.query_string === 'string') {
      request.query_string = REDACTED;
    }
    if (request.headers && typeof request.headers === 'object') {
      const headers = request.headers as Record<string, unknown>;
      delete headers.Authorization;
      delete headers.authorization;
      delete headers.Cookie;
      delete headers.cookie;
    }
    if (typeof request.url === 'string') {
      request.url = request.url.split('?')[0];
    }
  }
  if (clone.user) {
    clone.user = { id: REDACTED };
  }
  if (clone.extra) {
    clone.extra = scrubValue(clone.extra) as Record<string, unknown>;
  }
  if (typeof clone.message === 'string') {
    clone.message = scrubString(clone.message);
  }
  return clone;
}

export const LOGGER_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.otp',
  'req.body.code',
  'req.body.phone',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.fullName',
  'req.body.residenceAddress',
  'req.body.birthDate',
  'req.body.plateNumber',
  'req.body.vin',
  'req.body.inn',
  '*.password',
  '*.otp',
  '*.idempotencyKey',
  '*.credentials',
  '*.fullName',
  '*.full_name',
  '*.residenceAddress',
  '*.birthDate',
  '*.plateNumber',
  '*.vin',
  '*.inn',
  '*.ogrn',
  '*.phone',
];
