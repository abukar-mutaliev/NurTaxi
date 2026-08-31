/**
 * Сброс линии при запуске приложения (M8.1).
 *
 * Статус «на линии» хранится на сервере и переживал закрытие приложения: водитель заходил
 * и обнаруживал себя работающим, ничего для этого не сделав. Хуже того, закрытое
 * приложение продолжало числиться свободной машиной — подбор отдавал ему предложения,
 * ответить на которые было некому, и заказ висел до истечения срока, не уходя следующему.
 *
 * Поэтому выход на линию не переживает перезапуск: он делается осознанно, одним нажатием.
 * Сброс выполняется один раз за запуск процесса — если водитель включит линию сразу после,
 * повторный вход в этот эффект её не выключит.
 */
import { useEffect, useRef } from 'react';

import {
  useGetDriverProfileQuery,
  useUpdateDriverStatusMutation,
} from '@nurtaxi/shared-core/entities/driver';

import { useAppDispatch } from '@/app/store/hooks';

import { onlineIntentChanged } from './shift.slice';

export function useOfflineOnLaunch(): void {
  const dispatch = useAppDispatch();
  const { data: profile } = useGetDriverProfileQuery();
  const [updateStatus] = useUpdateDriverStatusMutation();

  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current || !profile) {
      return;
    }
    doneRef.current = true;

    /**
     * Локальное намерение гасим всегда: оно сохраняется между запусками и иначе показывало
     * бы переключатель включённым, пока грузится профиль.
     */
    dispatch(onlineIntentChanged(false));

    if (profile.onlineStatus !== 'online') {
      return;
    }

    void updateStatus({ status: 'offline' })
      .unwrap()
      .catch(() => {
        // Молча: не смогли снять с линии — водитель сделает это сам переключателем.
      });
  }, [dispatch, profile, updateStatus]);
}
