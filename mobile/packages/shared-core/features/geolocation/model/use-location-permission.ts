/**
 * Разрешения геолокации (M3.1, `§8.8`).
 *
 * UX-правило: отказ не должен ломать приложение — клиент может задать точку подачи
 * вручную на карте, поэтому хук возвращает состояние, а не бросает исключение.
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';

export type LocationPermissionState = 'undetermined' | 'granted' | 'denied';

export interface LocationPermission {
  state: LocationPermissionState;
  isChecking: boolean;
  /** `false`, если пользователь отказал навсегда — остаётся только «Открыть настройки». */
  canAskAgain: boolean;
  request: () => Promise<boolean>;
  openSettings: () => Promise<void>;
}

function toState(status: Location.PermissionStatus): LocationPermissionState {
  if (status === Location.PermissionStatus.GRANTED) {
    return 'granted';
  }
  return status === Location.PermissionStatus.DENIED ? 'denied' : 'undetermined';
}

export function useLocationPermission(): LocationPermission {
  const [state, setState] = useState<LocationPermissionState>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Location.getForegroundPermissionsAsync().then((result) => {
      if (cancelled) {
        return;
      }
      setState(toState(result.status));
      setCanAskAgain(result.canAskAgain);
      setIsChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    setIsChecking(true);
    const result = await Location.requestForegroundPermissionsAsync();
    setState(toState(result.status));
    setCanAskAgain(result.canAskAgain);
    setIsChecking(false);
    return result.status === Location.PermissionStatus.GRANTED;
  }, []);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return { state, isChecking, canAskAgain, request, openSettings };
}
