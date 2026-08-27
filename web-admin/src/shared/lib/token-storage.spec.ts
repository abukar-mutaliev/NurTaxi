import { describe, expect, it } from 'vitest';
import { tokenStorage } from './token-storage';

describe('token-storage (FZ-08.18)', () => {
  it('does not persist access token in sessionStorage', () => {
    sessionStorage.clear();
    tokenStorage.save({ accessToken: 'access-secret', refreshToken: 'refresh-secret' });
    expect(tokenStorage.getAccessToken()).toBe('access-secret');
    expect(sessionStorage.getItem('nurtaxi_admin_access')).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBe('refresh-secret');
    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
