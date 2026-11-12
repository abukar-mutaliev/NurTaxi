import { isPublicHttpsUrl, resolveMobileIdCallbackUrl } from './configuration';

describe('isPublicHttpsUrl', () => {
  it('отклоняет localhost, который SMS Aero не принимает', () => {
    expect(isPublicHttpsUrl('http://localhost:3000/api/v1/auth/mobile-id/callback')).toBe(false);
    expect(isPublicHttpsUrl('https://localhost/cb')).toBe(false);
    expect(isPublicHttpsUrl('')).toBe(false);
  });

  it('принимает публичный https', () => {
    expect(isPublicHttpsUrl('https://taxi.rulplus.ru/api/v1/auth/mobile-id/callback')).toBe(true);
  });
});

describe('resolveMobileIdCallbackUrl', () => {
  it('не дублирует префикс API и добавляет секрет', () => {
    expect(
      resolveMobileIdCallbackUrl({
        publicApi: 'https://taxi.rulplus.ru/api/v1',
        apiPrefix: 'api/v1',
        secret: 'sekret',
      }),
    ).toBe('https://taxi.rulplus.ru/api/v1/auth/mobile-id/callback?token=sekret');
  });
});
