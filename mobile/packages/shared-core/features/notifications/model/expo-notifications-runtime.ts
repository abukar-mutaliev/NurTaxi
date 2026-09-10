/**
 * Безопасная загрузка `expo-notifications`.
 *
 * С SDK 53 Android Expo Go бросает при импорте пакета: remote push из Go убрали.
 * Expo Router подгружает маршруты при старте, поэтому статический import в экране
 * настроек валил всё приложение и выглядел как «нет default export».
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function canImportExpoNotifications(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  return !(Platform.OS === 'android' && isExpoGo());
}

type ExpoNotifications = typeof import('expo-notifications');

let loadPromise: Promise<ExpoNotifications | null> | null = null;

export async function loadExpoNotifications(): Promise<ExpoNotifications | null> {
  if (!canImportExpoNotifications()) {
    return null;
  }

  loadPromise ??= import('expo-notifications').catch((error: unknown) => {
    console.warn('[push] expo-notifications unavailable', error);
    return null;
  });

  return loadPromise;
}
