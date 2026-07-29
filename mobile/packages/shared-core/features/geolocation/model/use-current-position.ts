/**
 * Текущее местоположение пользователя (M3.1, M3.3).
 * Точность `Balanced` — компромисс между расходом батареи и качеством точки подачи.
 */
import { useCallback, useEffect, useState } from 'react';

import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

import { getCachedCurrentPosition, resolveCurrentPosition } from './resolve-current-position';

export interface CurrentPosition {
  position: GeoPoint | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<GeoPoint | null>;
}

export function useCurrentPosition(enabled: boolean): CurrentPosition {
  const [position, setPosition] = useState<GeoPoint | null>(
    () => getCachedCurrentPosition(Number.POSITIVE_INFINITY) ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await resolveCurrentPosition({ forceRefresh: true });
      if (next) {
        setPosition(next);
        return next;
      }

      setError('Не удалось определить местоположение');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const next = await resolveCurrentPosition();
      if (cancelled) {
        return;
      }

      if (next) {
        setPosition(next);
      } else {
        setError('Не удалось определить местоположение');
      }

      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { position, isLoading, error, refresh };
}
