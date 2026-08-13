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

/**
 * Подписчики на смену access-токена (M5.5).
 *
 * Нужны WebSocket-соединению: его токен подставляется один раз в хендшейк, и после
 * протухания сервер отклоняет подключение. REST в этот момент уже обновил токены, но
 * сокет об этом никак не узнаёт — отсюда уведомление.
 */
type AccessTokenListener = (accessToken: string | null) => void;
const accessTokenListeners = new Set<AccessTokenListener>();

function notifyAccessTokenChanged(previous: string | null): void {
  const next = cache?.accessToken ?? null;
  if (next === previous) {
    return;
  }
  accessTokenListeners.forEach((listener) => listener(next));
}

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
    const previous = cache?.accessToken ?? null;
    cache = tokens;
    loaded = true;
    await Promise.all([
      setItem(ACCESS_KEY, tokens.accessToken),
      setItem(REFRESH_KEY, tokens.refreshToken),
    ]);
    notifyAccessTokenChanged(previous);
  },

  async clear(): Promise<void> {
    const previous = cache?.accessToken ?? null;
    cache = null;
    loaded = true;
    await Promise.all([removeItem(ACCESS_KEY), removeItem(REFRESH_KEY)]);
    notifyAccessTokenChanged(previous);
  },

  /**
   * Уведомляет о смене access-токена. Возвращает функцию отписки.
   * Кэш обновляется до записи в защищённое хранилище, поэтому подписчик всегда видит
   * актуальное значение через `getAccessToken()`.
   */
  onAccessTokenChange(listener: AccessTokenListener): () => void {
    accessTokenListeners.add(listener);
    return () => accessTokenListeners.delete(listener);
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
