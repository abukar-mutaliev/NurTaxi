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

/** Пауза перед повторной загрузкой профиля, когда сервер не ответил. */
const RETRY_DELAY_MS = 5000;

function isSupportedLanguage(value: string): value is AppLanguage {
  return (Object.values(AppLanguage) as string[]).includes(value);
}

/**
 * Сервер ответил, что сессия недействительна, — а не просто не ответил. Только тогда
 * выходим в гостевой режим: раньше выход случался и при запуске без связи, и водитель
 * терял аккаунт вместе с линией.
 */
function isSessionRejected(cause: unknown): boolean {
  const status = (cause as { status?: unknown } | null)?.status;
  return status === 401 || status === 403;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

      while (!cancelled) {
        try {
          const profile = await fetchMe().unwrap();
          if (cancelled) {
            return;
          }
          dispatch(profileLoaded(profile));
          if (isSupportedLanguage(profile.language)) {
            await changeLanguage(profile.language);
          }
          return;
        } catch (cause) {
          if (cancelled) {
            return;
          }
          if (isSessionRejected(cause)) {
            // Токен оказался нерабочим и refresh не помог — выходим в гостевой режим.
            dispatch(signedOut());
            return;
          }
          // Нет связи или сервер недоступен: сессия цела, пробуем ещё раз.
          await delay(RETRY_DELAY_MS);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [dispatch, fetchMe]);
}
