/**
 * Пока идёт Mobile ID, экран входа опрашивает сервер.
 * SIM-push подтверждается без кода; если оператор его не доставил, статус становится
 * `otp_required` и экран показывает поле SMS.
 */
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  selectAuthMethod,
  selectChallengeStatus,
  selectPendingPhone,
  type WithSessionState,
} from '@nurtaxi/shared-core/entities/session';
import { toAppError } from '@nurtaxi/shared-core/shared/api';

import { useAuth } from './use-auth';

const POLL_MS = 2000;

export function useMobileIdWait(): {
  pushPending: boolean;
  failed: boolean;
  error: string | null;
} {
  const phone = useSelector((state: WithSessionState) => selectPendingPhone(state));
  const method = useSelector((state: WithSessionState) => selectAuthMethod(state));
  const status = useSelector((state: WithSessionState) => selectChallengeStatus(state));
  const { pollOtpStatus } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const pushPending = method === 'mobile-id' && status === 'pending';

  useEffect(() => {
    if (!phone || method !== 'mobile-id') return;
    if (status !== 'pending' && status !== 'otp_required') return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      if (inflight.current || cancelled) return;
      inflight.current = true;
      try {
        await pollOtpStatus(phone);
        if (!cancelled) setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(toAppError(cause as never).message);
          cancelled = true;
          if (timer) clearInterval(timer);
        }
      } finally {
        inflight.current = false;
      }
    };

    void tick();
    timer = setInterval(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [method, phone, pollOtpStatus, status]);

  return { pushPending, failed: status === 'failed', error };
}
