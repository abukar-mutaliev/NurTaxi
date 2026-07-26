/**
 * Текущее местоположение пользователя (M3.1, M3.3).
 * Точность `Balanced` — компромисс между расходом батареи и качеством точки подачи.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

export interface CurrentPosition {
  position: GeoPoint | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<GeoPoint | null>;
}

export function useCurrentPosition(enabled: boolean): CurrentPosition {
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: GeoPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setPosition(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось определить местоположение');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void refresh();
    }
  }, [enabled, refresh]);

  return { position, isLoading, error, refresh };
}
