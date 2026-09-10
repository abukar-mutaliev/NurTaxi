import { Environment } from './env.validation';

const DEFAULT_SECRETS = new Set([
  'change-me-access-secret',
  'change-me-refresh-secret',
  'nurtaxi',
  'nurtaxi123',
]);

function hostnameOf(raw: string | undefined): string {
  if (!raw) return '';
  try {
    const withScheme = raw.includes('://') ? raw : `http://${raw}`;
    return new URL(withScheme).hostname;
  } catch {
    return '';
  }
}

function isLoopbackOrPrivateHost(host: string): boolean {
  if (!host) return true;
  const normalized = host.toLowerCase();
  if (normalized === 'localhost' || normalized === '::1') return true;
  if (normalized === '0.0.0.0' || /^127\./.test(normalized)) return true;
  if (/^10\./.test(normalized) || /^192\.168\./.test(normalized)) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
}

function usesPublishedS3Defaults(env: Record<string, string | undefined>): boolean {
  const accessKey = env.S3_ACCESS_KEY ?? 'nurtaxi';
  const secretKey = env.S3_SECRET_KEY ?? 'nurtaxi123';
  return (
    !env.S3_ACCESS_KEY ||
    !env.S3_SECRET_KEY ||
    DEFAULT_SECRETS.has(accessKey) ||
    DEFAULT_SECRETS.has(secretKey)
  );
}

function isPublicS3Endpoint(env: Record<string, string | undefined>): boolean {
  const host = hostnameOf(env.S3_PUBLIC_ENDPOINT || env.S3_ENDPOINT);
  return !isLoopbackOrPrivateHost(host);
}

export function assertProductionSecurity(env: Record<string, string | undefined>): void {
  const nodeEnv = env.NODE_ENV ?? Environment.Development;
  const problems: string[] = [];

  // Даже в development: если хранилище торчит в интернет, пароль из репозитория
  // открывает паспорта и права водителей кому угодно (консоль :9001 / S3 API :9000).
  if (isPublicS3Endpoint(env) && usesPublishedS3Defaults(env)) {
    problems.push(
      'S3_ACCESS_KEY/S3_SECRET_KEY не заданы или совпадают со значениями из репозитория, ' +
        'а адрес хранилища доступен из интернета',
    );
  }

  if (nodeEnv === Environment.Production || nodeEnv === Environment.Staging) {
    if (DEFAULT_SECRETS.has(env.JWT_ACCESS_SECRET ?? '') || !env.JWT_ACCESS_SECRET) {
      problems.push('JWT_ACCESS_SECRET не задан или равен значению по умолчанию');
    }
    if (DEFAULT_SECRETS.has(env.JWT_REFRESH_SECRET ?? '') || !env.JWT_REFRESH_SECRET) {
      problems.push('JWT_REFRESH_SECRET не задан или равен значению по умолчанию');
    }
    if (DEFAULT_SECRETS.has(env.DB_PASSWORD ?? '')) {
      problems.push('DB_PASSWORD равен значению по умолчанию');
    }
    if (env.DB_SSL !== 'true') {
      problems.push('DB_SSL должен быть true в staging/production');
    }
    if (env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
      problems.push('DB_SSL_REJECT_UNAUTHORIZED=false запрещён в staging/production');
    }
    if (!env.CORS_ORIGINS || env.CORS_ORIGINS.trim() === '' || env.CORS_ORIGINS.includes('*')) {
      problems.push('CORS_ORIGINS должен содержать явный список источников без *');
    }
    if (!env.FIELD_ENCRYPTION_KEY || env.FIELD_ENCRYPTION_KEY.length < 32) {
      problems.push('FIELD_ENCRYPTION_KEY должен быть задан (минимум 32 символа)');
    }
    const s3Region = env.S3_REGION ?? '';
    if (/us-|eu-|ap-|sa-|ca-|af-|me-/.test(s3Region) && !s3Region.startsWith('ru-')) {
      problems.push(`S3_REGION=${s3Region} указывает на зарубежную зону`);
    }
    if (usesPublishedS3Defaults(env)) {
      problems.push('S3_ACCESS_KEY/S3_SECRET_KEY не заданы или равны значениям по умолчанию');
    }
  }

  if (problems.length > 0) {
    throw new Error(`Отказ старта в ${nodeEnv}:\n- ${problems.join('\n- ')}`);
  }
}

const DEV_ADMIN_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
];

export function parseCorsOrigins(raw: string | undefined, env: string): string[] | boolean {
  if (env === Environment.Production || env === Environment.Staging) {
    return (raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!raw) return true;
  const listed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...listed, ...DEV_ADMIN_ORIGINS])];
}
