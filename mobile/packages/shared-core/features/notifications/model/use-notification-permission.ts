/**
 * Разрешения push-уведомлений (M10.1).
 *
 * Отказ не ломает приложение — пользователь может включить push позже в настройках.
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationPermissionState = 'undetermined' | 'granted' | 'denied';

export interface NotificationPermission {
  state: NotificationPermissionState;
  isChecking: boolean;
  canAskAgain: boolean;
  request: () => Promise<boolean>;
  openSettings: () => Promise<void>;
}

function toState(status: Notifications.PermissionStatus): NotificationPermissionState {
  if (status === Notifications.PermissionStatus.GRANTED) {
    return 'granted';
  }
  return status === Notifications.PermissionStatus.DENIED ? 'denied' : 'undetermined';
}

export function useNotificationPermission(): NotificationPermission {
  const [state, setState] = useState<NotificationPermissionState>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Notifications.getPermissionsAsync().then((result) => {
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
    setIsChecking(true);
    const result = await Notifications.requestPermissionsAsync();
    setState(toState(result.status));
    setCanAskAgain(result.canAskAgain ?? true);
    setIsChecking(false);
    return result.status === Notifications.PermissionStatus.GRANTED;
  }, []);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return { state, isChecking, canAskAgain, request, openSettings };
}
