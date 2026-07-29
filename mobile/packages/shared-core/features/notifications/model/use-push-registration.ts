/**
 * Регистрация push-токена на сервере после входа (M10.1).
 */
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { useRegisterPushTokenMutation } from '@nurtaxi/shared-core/entities/notification';
import { selectIsAuthenticated } from '@nurtaxi/shared-core/entities/session';

import { acquirePushToken } from './acquire-push-token';

export function usePushRegistration(enabled = true): void {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [registerToken] = useRegisterPushTokenMutation();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      lastTokenRef.current = null;
      return;
    }

    let cancelled = false;

    const register = async () => {
      const result = await acquirePushToken();
      if (cancelled || !result || result.token === lastTokenRef.current) {
        return;
      }

      try {
        await registerToken({
          token: result.token,
          platform: result.platform,
        }).unwrap();
        lastTokenRef.current = result.token;
      } catch (error) {
        console.warn('[push] token registration failed', error);
      }
    };

    void register();
    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, registerToken]);
}
