const ACCESS_KEY = 'nurtaxi_admin_access';
const REFRESH_KEY = 'nurtaxi_admin_refresh';

/** Access-токен в памяти; дублируется в sessionStorage для восстановления при F5 в той же вкладке. */
let accessTokenMemory: string | null = null;

function readAccessFromStorage(): string | null {
  return sessionStorage.getItem(ACCESS_KEY);
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessTokenMemory ?? readAccessFromStorage();
  },

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_KEY);
  },

  save(tokens: { accessToken: string; refreshToken: string }): void {
    accessTokenMemory = tokens.accessToken;
    sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
    sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },

  clear(): void {
    accessTokenMemory = null;
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
  },
};
