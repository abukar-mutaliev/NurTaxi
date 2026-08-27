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

  it('parses explicit CORS origins in production', () => {
    expect(parseCorsOrigins('https://admin.nurtaxi.ru', Environment.Production)).toEqual([
      'https://admin.nurtaxi.ru',
    ]);
  });
});
