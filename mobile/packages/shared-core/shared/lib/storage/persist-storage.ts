/**
 * Адаптер redux-persist для native и web (M0.4).
 *
 * AsyncStorage на web обращается к `window` и падает при SSR в Expo Router.
 * На web используем localStorage в браузере и noop в Node.js.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Storage } from 'redux-persist';

const noopStorage: Storage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

function createWebStorage(): Storage {
  return {
    getItem: (key) => {
      if (typeof globalThis.localStorage === 'undefined') {
        return Promise.resolve(null);
      }
      return Promise.resolve(globalThis.localStorage.getItem(key));
    },
    setItem: (key, value) => {
      globalThis.localStorage?.setItem(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      globalThis.localStorage?.removeItem(key);
      return Promise.resolve();
    },
  };
}

export const persistStorage: Storage = Platform.OS === 'web' ? createWebStorage() : AsyncStorage;

/** Для тестов и SSR: всегда без побочных эффектов записи. */
export const noopPersistStorage = noopStorage;
