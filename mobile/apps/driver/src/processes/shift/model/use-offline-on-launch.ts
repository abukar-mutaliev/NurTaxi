/**
 * Сброс линии при запуске приложения (M8.1).
 *
 * Статус «на линии» хранится на сервере и переживал закрытие приложения: водитель заходил
 * и обнаруживал себя работающим, ничего для этого не сделав. Хуже того, закрытое
 * приложение продолжало числиться свободной машиной — подбор отдавал ему предложения,
 * ответить на которые было некому, и заказ висел до истечения срока, не уходя следующему.
 *
 * Поэтому выход на линию не переживает перезапуск: он делается осознанно, одним нажатием.
 * Исключение — процесс выгрузила система, пока водитель ненадолго переключился на другое
 * приложение: это не закрытие, и снимать его с линии было бы ошибкой — заказ, оформленный
 * в эту минуту, до него просто не доходил. Сброс выполняется один раз за запуск процесса —
 * если водитель включит линию сразу после, повторный вход в этот эффект её не выключит.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  useGetDriverProfileQuery,
  useUpdateDriverStatusMutation,
} from '@nurtaxi/shared-core/entities/driver';

import { useAppDispatch, useAppStore } from '@/app/store/hooks';

import {
  appBackgrounded,
  onlineIntentChanged,
  selectShift,
  shouldKeepOnlineOnLaunch,
} from './shift.slice';

/**
 * `flushPersistedState` — немедленная запись состояния на диск (`persistor.flush()`).
 * redux-persist пишет по таймеру, а таймеры JS на Android в фоне стоят: отметка ухода в фон
 * доходила до диска только при возврате на экран. Если MIUI выгружала свёрнутое приложение
 * раньше, отметка терялась, и запуск снимал водителя с линии по вчерашнему времени.
 */
export function useOfflineOnLaunch(flushPersistedState: () => Promise<unknown>): void {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { data: profile } = useGetDriverProfileQuery();
  const [updateStatus] = useUpdateDriverStatusMutation();

  /**
   * Решение принимается по состоянию, восстановленному с диска, — до того, как эта сессия
   * успеет обновить отметки. Иначе свежая координата от только что запущенного трекинга
   * выдала бы давно закрытое приложение за недавно свёрнутое.
   */
  const [keepOnline] = useState(() =>
    shouldKeepOnlineOnLaunch(selectShift(store.getState()), Date.now()),
  );
  const doneRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        dispatch(appBackgrounded(new Date().toISOString()));
        void flushPersistedState().catch(() => {
          // Не записали — запуск поведёт себя как раньше и снимет с линии.
        });
      }
    });
    return () => subscription.remove();
  }, [dispatch, flushPersistedState]);

  useEffect(() => {
    if (doneRef.current || !profile) {
      return;
    }
    doneRef.current = true;

    const isOnline = profile.onlineStatus === 'online';
    if (keepOnline && isOnline) {
      dispatch(onlineIntentChanged(true));
      return;
    }

    /**
     * Локальное намерение гасим всегда: оно сохраняется между запусками и иначе показывало
     * бы переключатель включённым, пока грузится профиль.
     */
    dispatch(onlineIntentChanged(false));

    if (!isOnline) {
      return;
    }

    void updateStatus({ status: 'offline' })
      .unwrap()
      .catch(() => {
        // Молча: не смогли снять с линии — водитель сделает это сам переключателем.
      });
  }, [dispatch, keepOnline, profile, updateStatus]);
}
