/**
 * Guard-навигация приложения водителя (M1.8, M7.4).
 *
 * У водителя три состояния вместо двух: гость, «анкета/документы не приняты» и допущенный
 * к работе. Пока верификация не пройдена, приложение не пускает дальше группы
 * `(verification)` — это требование `§8.2` и `§12.3`, а не только UX.
 */
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { VerificationStatus } from '@nurtaxi/shared-core/shared/model';
import { selectSessionStatus } from '@nurtaxi/shared-core/entities/session';
import { useGetDriverProfileQuery } from '@nurtaxi/shared-core/entities/driver';

import { useAppSelector } from '../store/hooks';

const AUTH_GROUP = '(auth)';
const VERIFICATION_GROUP = '(verification)';

export function useAuthGuard(): { isResolving: boolean } {
  const router = useRouter();
  // useSegments типизирован кортежем известных маршрутов; для сравнения групп нужен обычный массив.
  const segments = useSegments() as string[];
  const status = useAppSelector(selectSessionStatus);

  const isAuthenticated = status === 'authenticated';
  const { data: profile, isLoading: isProfileLoading } = useGetDriverProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Отсутствие профиля означает, что анкета ещё не подана, — это нормальное состояние.
  const isApproved = profile?.verificationStatus === VerificationStatus.Approved;
  const isResolving = status === 'unknown' || (isAuthenticated && isProfileLoading);

  useEffect(() => {
    if (isResolving) {
      return;
    }

    const group = segments[0];

    if (!isAuthenticated) {
      if (group !== AUTH_GROUP) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    if (!isApproved) {
      if (group !== VERIFICATION_GROUP) {
        router.replace('/(verification)/status');
      }
      return;
    }

    if (group === AUTH_GROUP || group === VERIFICATION_GROUP) {
      router.replace('/(tabs)');
    }
  }, [router, segments, isAuthenticated, isApproved, isResolving]);

  return { isResolving };
}
