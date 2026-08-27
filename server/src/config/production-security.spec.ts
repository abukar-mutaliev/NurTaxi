import { Environment } from './env.validation';
import { assertProductionSecurity, parseCorsOrigins } from './production-security';

describe('assertProductionSecurity', () => {
  it('allows development with defaults', () => {
    expect(() =>
      assertProductionSecurity({ NODE_ENV: Environment.Development, JWT_ACCESS_SECRET: 'change-me-access-secret' }),
    ).not.toThrow();
  });

  it('refuses production with default secrets and open CORS', () => {
    expect(() =>
      assertProductionSecurity({
        NODE_ENV: Environment.Production,
        JWT_ACCESS_SECRET: 'change-me-access-secret',
        JWT_REFRESH_SECRET: 'change-me-refresh-secret',
        DB_PASSWORD: 'nurtaxi',
        DB_SSL: 'false',
        CORS_ORIGINS: '*',
        S3_REGION: 'us-east-1',
      }),
    ).toThrow(/Отказ старта/);
  });

  it('refuses production without FIELD_ENCRYPTION_KEY', () => {
    expect(() =>
      assertProductionSecurity({
        NODE_ENV: Environment.Production,
        JWT_ACCESS_SECRET: 'a-long-enough-access-secret-value',
        JWT_REFRESH_SECRET: 'a-long-enough-refresh-secret-value',
        DB_PASSWORD: 'strong-db-password',
        DB_SSL: 'true',
        CORS_ORIGINS: 'https://admin.nurtaxi.ru',
        S3_REGION: 'ru-central-1',
      }),
    ).toThrow(/FIELD_ENCRYPTION_KEY/);
  });

  it('allows production when secrets, TLS, CORS and encryption key are set', () => {
    expect(() =>
      assertProductionSecurity({
        NODE_ENV: Environment.Production,
        JWT_ACCESS_SECRET: 'a-long-enough-access-secret-value',
        JWT_REFRESH_SECRET: 'a-long-enough-refresh-secret-value',
        DB_PASSWORD: 'strong-db-password',
        DB_SSL: 'true',
        CORS_ORIGINS: 'https://admin.nurtaxi.ru',
        S3_REGION: 'ru-central-1',
        FIELD_ENCRYPTION_KEY: 'nurtaxi-prod-field-encryption-key-32ch',
      }),
    ).not.toThrow();
  });

  it('parses explicit CORS origins in production', () => {
    expect(parseCorsOrigins('https://admin.nurtaxi.ru', Environment.Production)).toEqual([
      'https://admin.nurtaxi.ru',
    ]);
  });

  it('allows all origins in development when CORS_ORIGINS is empty', () => {
    expect(parseCorsOrigins(undefined, Environment.Development)).toBe(true);
    expect(parseCorsOrigins('', Environment.Development)).toBe(true);
  });

  it('keeps localhost admin origins in development when CORS_ORIGINS is set', () => {
    expect(parseCorsOrigins('https://taxi.rulplus.ru', Environment.Development)).toEqual(
      expect.arrayContaining([
        'https://taxi.rulplus.ru',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]),
    );
  });
});
