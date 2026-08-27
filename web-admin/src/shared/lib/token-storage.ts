const ACCESS_KEY = 'nurtaxi_admin_access';
const REFRESH_KEY = 'nurtaxi_admin_refresh';

/** Access-токен только в памяти (FZ-08.18); refresh — в sessionStorage. */
let accessTokenMemory: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessTokenMemory;
  },

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_KEY);
  },

  save(tokens: { accessToken: string; refreshToken: string }): void {
    accessTokenMemory = tokens.accessToken;
    sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },

  clear(): void {
    accessTokenMemory = null;
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
  },
};
