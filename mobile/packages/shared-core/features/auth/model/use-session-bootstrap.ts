/**
 * Восстановление сессии при старте приложения (M1.4, M1.8).
 *
 * Порядок: читаем SecureStore → сообщаем сессии, есть ли токены → если есть, подтягиваем
 * профиль `GET /me` и синхронизируем язык интерфейса с сохранённым в профиле (`§24`).
 * До завершения этой процедуры навигация показывает splash, чтобы не мигал экран входа.
 */
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { changeLanguage } from '@nurtaxi/shared-core/shared/i18n';
import { AppLanguage } from '@nurtaxi/shared-core/shared/model';
import {
  profileLoaded,
  restoreSession,
  sessionRestored,
  signedOut,
} from '@nurtaxi/shared-core/entities/session';
import { useLazyGetMeQuery } from '@nurtaxi/shared-core/entities/user';

function isSupportedLanguage(value: string): value is AppLanguage {
  return (Object.values(AppLanguage) as string[]).includes(value);
}

export function useSessionBootstrap(): void {
  const dispatch = useDispatch();
  const [fetchMe] = useLazyGetMeQuery();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const { hasTokens } = await restoreSession();
      if (cancelled) {
        return;
      }
      dispatch(sessionRestored({ hasTokens }));

      if (!hasTokens) {
        return;
      }

      try {
        const profile = await fetchMe().unwrap();
        if (cancelled) {
          return;
        }
        dispatch(profileLoaded(profile));
        if (isSupportedLanguage(profile.language)) {
          await changeLanguage(profile.language);
        }
      } catch {
        // Токен оказался нерабочим и refresh не помог — выходим в гостевой режим.
        if (!cancelled) {
          dispatch(signedOut());
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [dispatch, fetchMe]);
}
