import { useCallback, useEffect, useRef, useState } from 'react';

export interface Countdown {
  secondsLeft: number;
  isFinished: boolean;
  restart: (seconds: number) => void;
}

/**
 * Обратный отсчёт в секундах. Используется таймером повторной отправки OTP (`M1.3`):
 * сервер разрешает повторный запрос кода не чаще, чем через `resendAfterSec`.
 */
export function useCountdown(initialSeconds = 0): Countdown {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restart = useCallback(
    (seconds: number) => {
      stop();
      setSecondsLeft(Math.max(0, Math.floor(seconds)));
    },
    [stop],
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      stop();
      return;
    }
    if (intervalRef.current !== null) {
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          stop();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return stop;
  }, [secondsLeft, stop]);

  return { secondsLeft, isFinished: secondsLeft <= 0, restart };
}
