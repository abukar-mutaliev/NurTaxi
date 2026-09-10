/**
 * Разрешения push-уведомлений (M10.1).
 *
 * Отказ не ломает приложение — пользователь может включить push позже в настройках.
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { canImportExpoNotifications, loadExpoNotifications } from './expo-notifications-runtime';

export type NotificationPermissionState = 'undetermined' | 'granted' | 'denied';

export interface NotificationPermission {
  state: NotificationPermissionState;
  isChecking: boolean;
  canAskAgain: boolean;
  request: () => Promise<boolean>;
  openSettings: () => Promise<void>;
}

function toState(status: string): NotificationPermissionState {
  if (status === 'granted') {
    return 'granted';
  }
  return status === 'denied' ? 'denied' : 'undetermined';
}

export function useNotificationPermission(): NotificationPermission {
  const [state, setState] = useState<NotificationPermissionState>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isChecking, setIsChecking] = useState(canImportExpoNotifications());

  useEffect(() => {
    if (!canImportExpoNotifications()) {
      return;
    }

    let cancelled = false;
    void loadExpoNotifications().then(async (Notifications) => {
      if (!Notifications || cancelled) {
        if (!cancelled) {
          setIsChecking(false);
        }
        return;
      }
      const result = await Notifications.getPermissionsAsync();
      if (cancelled) {
        return;
      }
      setState(toState(result.status));
      setCanAskAgain(result.canAskAgain ?? true);
      setIsChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    const Notifications = await loadExpoNotifications();
    if (!Notifications) {
      return false;
    }

    setIsChecking(true);
    const result = await Notifications.requestPermissionsAsync();
    setState(toState(result.status));
    setCanAskAgain(result.canAskAgain ?? true);
    setIsChecking(false);
    return result.status === 'granted';
  }, []);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return { state, isChecking, canAskAgain, request, openSettings };
}
