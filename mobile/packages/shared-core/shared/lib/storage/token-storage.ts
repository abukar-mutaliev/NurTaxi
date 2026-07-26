/**
 * Хранилище JWT (M1.4).
 *
 * Требование `requirements.md §20` / `design.md §9`: токены не попадают в redux-persist и
 * AsyncStorage, только в защищённое хранилище ОС (Keychain / Keystore). В памяти держится
 * синхронный кэш, чтобы `prepareHeaders` в RTK Query мог подставить Bearer без await.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'nurtaxi.accessToken';
const REFRESH_KEY = 'nurtaxi.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

let cache: StoredTokens | null = null;
let loaded = false;

/** На web SecureStore недоступен — используем sessionStorage только для локальной отладки. */
const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.sessionStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.sessionStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.sessionStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  /** Читает токены из защищённого хранилища в кэш. Вызывается один раз при старте приложения. */
  async restore(): Promise<StoredTokens | null> {
    if (loaded) {
      return cache;
    }
    const [accessToken, refreshToken] = await Promise.all([
      getItem(ACCESS_KEY),
      getItem(REFRESH_KEY),
    ]);
    loaded = true;
    cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    return cache;
  },

  async save(tokens: StoredTokens): Promise<void> {
    cache = tokens;
    loaded = true;
    await Promise.all([
      setItem(ACCESS_KEY, tokens.accessToken),
      setItem(REFRESH_KEY, tokens.refreshToken),
    ]);
  },

  async clear(): Promise<void> {
    cache = null;
    loaded = true;
    await Promise.all([removeItem(ACCESS_KEY), removeItem(REFRESH_KEY)]);
  },

  /** Синхронный доступ для `prepareHeaders` и WebSocket-хендшейка. */
  getAccessToken(): string | null {
    return cache?.accessToken ?? null;
  },

  getRefreshToken(): string | null {
    return cache?.refreshToken ?? null;
  },

  hasTokens(): boolean {
    return cache !== null;
  },
};
