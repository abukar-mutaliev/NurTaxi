import { useEffect, useState } from 'react';

import type { OrderWaiting } from '@nurtaxi/shared-core/shared/model';

import { describeWaiting, type WaitingClock } from './waiting';

/** Секундные часы ожидания. Останавливаются, когда поездка началась. */
export function useWaitingClock(waiting: OrderWaiting | null | undefined): WaitingClock | null {
  const [now, setNow] = useState(() => Date.now());
  const running = Boolean(waiting && !waiting.endedAt);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  if (!waiting) {
    return null;
  }

  const end = waiting.endedAt ? Date.parse(waiting.endedAt) : now;
  if (Number.isNaN(end)) {
    return null;
  }
  return describeWaiting(waiting, end);
}
