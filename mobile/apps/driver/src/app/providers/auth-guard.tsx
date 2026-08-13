/**
 * Guard-навигация приложения водителя (M1.7, M1.8, M7.4).
 *
 * У водителя четыре состояния вместо двух: гость, «согласие ПДн не дано», «анкета/документы
 * не приняты» и допущенный к работе. Пока согласие не дано и верификация не пройдена,
 * приложение не пускает дальше групп `(auth)` / `(verification)` — это требования `§8.1`,
 * `§8.2` и `§12.3`, а не только UX.
 */
import { useEffect } from 'react';
import { useRouter, useSegments, type Href } from 'expo-router';

import { VerificationStatus } from '@nurtaxi/shared-core/shared/model';
import {
  selectRequiresOnboarding,
  selectSessionStatus,
} from '@nurtaxi/shared-core/entities/session';
import { useGetDriverProfileQuery } from '@nurtaxi/shared-core/entities/driver';

import { useAppSelector } from '../store/hooks';

const AUTH_GROUP = '(auth)';
const VERIFICATION_GROUP = '(verification)';
/**
 * Экран ожидания внутри `(verification)`. Только он выталкивает допущенного водителя
 * обратно в приложение: анкета и документы остаются доступны для правок из профиля.
 */
const VERIFICATION_STATUS_SCREEN = 'status';
const CONSENT_SCREEN = 'consent';
const AUTH_WELCOME_ROUTE = '/(auth)/welcome' as Href;
const CONSENT_ROUTE = '/(auth)/consent' as Href;

/**
 * Локальный переключатель для вёрстки: `true` отключает перенаправления, и тогда любой
 * экран открывается напрямую (через `/_sitemap` или deep link), без входа и верификации.
 *
 * Верните `false` перед коммитом, иначе перестанете замечать поломки самих переходов.
 */
const SKIP_GUARD_LOCAL = false;

/**
 * Обход guard включается локальным переключателем выше либо переменной
 * `EXPO_PUBLIC_DEV_SKIP_GUARD=1` в `.env`.
 *
 * Оба варианта обёрнуты в `__DEV__`: в production-сборке он всегда `false`, поэтому
 * случайно оставленный `true` не ослабит проверку верификации у реальных водителей (`§8.2`).
 */
const SKIP_GUARD = __DEV__ && (SKIP_GUARD_LOCAL || process.env.EXPO_PUBLIC_DEV_SKIP_GUARD === '1');

export function useAuthGuard(): { isResolving: boolean } {
  const router = useRouter();
  // useSegments типизирован кортежем известных маршрутов; для сравнения групп нужен обычный массив.
  const segments = useSegments() as string[];
  const status = useAppSelector(selectSessionStatus);
  const requiresConsent = useAppSelector(selectRequiresOnboarding);

  const isAuthenticated = status === 'authenticated';
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError,
    error,
  } = useGetDriverProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  const hasNoProfile = isError && error !== undefined && 'status' in error && error.status === 404;

  // Отсутствие профиля означает, что анкета ещё не подана, — это нормальное состояние.
  const isApproved = profile?.verificationStatus === VerificationStatus.Approved;
  const isResolving = status === 'unknown' || (isAuthenticated && isProfileLoading);

  useEffect(() => {
    if (isResolving || SKIP_GUARD) {
      return;
    }

    const group = segments[0];
    const screen = segments[1];

    if (!isAuthenticated) {
      if (group !== AUTH_GROUP) {
        router.replace(AUTH_WELCOME_ROUTE);
      }
      return;
    }

    /**
     * Согласие на обработку ПДн — условие работы в сервисе (152-ФЗ, `§8.1`), поэтому оно
     * идёт раньше анкеты: без него сервер всё равно держит профиль «в онбординге».
     */
    if (requiresConsent) {
      if (group !== AUTH_GROUP || screen !== CONSENT_SCREEN) {
        router.replace(CONSENT_ROUTE);
      }
      return;
    }

    if (hasNoProfile) {
      if (group !== VERIFICATION_GROUP || screen !== 'registration') {
        router.replace('/(verification)/registration');
      }
      return;
    }

    if (!isApproved) {
      if (group !== VERIFICATION_GROUP) {
        router.replace('/(verification)/status');
      }
      return;
    }

    if (group === AUTH_GROUP) {
      router.replace('/(tabs)');
      return;
    }

    // Раньше сюда попадал любой экран группы `(verification)`, поэтому переходы
    // «Автомобиль» и «Документы» из профиля мгновенно откатывались на карту (M7.5).
    if (group === VERIFICATION_GROUP && screen === VERIFICATION_STATUS_SCREEN) {
      router.replace('/(tabs)');
    }
  }, [router, segments, isAuthenticated, requiresConsent, hasNoProfile, isApproved, isResolving]);

  // При отключённом guard экран-заглушка «резолвинга» тоже не нужен.
  return { isResolving: SKIP_GUARD ? false : isResolving };
}
