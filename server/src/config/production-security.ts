import { Environment } from './env.validation';

const DEFAULT_SECRETS = new Set([
  'change-me-access-secret',
  'change-me-refresh-secret',
  'nurtaxi',
  'nurtaxi123',
]);

export function assertProductionSecurity(env: Record<string, string | undefined>): void {
  const nodeEnv = env.NODE_ENV ?? Environment.Development;
  if (nodeEnv !== Environment.Production && nodeEnv !== Environment.Staging) {
    return;
  }

  const problems: string[] = [];

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
  const s3Region = env.S3_REGION ?? '';
  if (/us-|eu-|ap-|sa-|ca-|af-|me-/.test(s3Region) && !s3Region.startsWith('ru-')) {
    problems.push(`S3_REGION=${s3Region} указывает на зарубежную зону`);
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
