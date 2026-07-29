/**
 * Guard-навигация: разделение стеков «гость / авторизован / онбординг» (M1.8).
 *
 * Логика намеренно живёт в одном месте: любой экран может быть открыт по deep link, поэтому
 * проверка выполняется на каждое изменение маршрута, а не только при старте.
 */
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import {
  selectRequiresOnboarding,
  selectSessionStatus,
} from '@nurtaxi/shared-core/entities/session';

import { useAppSelector } from '../store/hooks';

const AUTH_GROUP = '(auth)';
const ONBOARDING_ROUTE = 'onboarding';

export function useAuthGuard(): { isResolving: boolean } {
  const router = useRouter();
  // useSegments типизирован кортежем известных маршрутов; для проверки вложенности нужен обычный массив.
  const segments = useSegments() as string[];
  const status = useAppSelector(selectSessionStatus);
  const requiresOnboarding = useAppSelector(selectRequiresOnboarding);

  useEffect(() => {
    if (status === 'unknown') {
      return;
    }

    const inAuthGroup = segments[0] === AUTH_GROUP;
    const onOnboarding = segments[1] === ONBOARDING_ROUTE;

    if (status === 'anonymous' && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (status === 'anonymous' && inAuthGroup && segments[1] === undefined) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (status === 'authenticated') {
      if (requiresOnboarding && !onOnboarding) {
        router.replace('/(auth)/onboarding');
        return;
      }
      if (!requiresOnboarding && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [router, segments, status, requiresOnboarding]);

  return { isResolving: status === 'unknown' };
}
