/** Форматирование денег, расстояний, времени и дат. Локаль региона — ru-RU (`§6.3`). */

const DEFAULT_LOCALE = 'ru-RU';

export function formatMoney(amount: number, currency = 'RUB', locale = DEFAULT_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

/** Метры → «850 м» / «12,4 км». */
export function formatDistance(meters: number, locale = DEFAULT_LOCALE): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  const km = meters / 1000;
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })} км`;
}

/** Секунды → «3 мин» / «1 ч 20 мин». Используется для ETA и длительности поездки. */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} мин`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

/** Секунды → «02:45» для таймера повторной отправки OTP. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function formatDateTime(iso: string, locale = DEFAULT_LOCALE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string, locale = DEFAULT_LOCALE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatRating(rating: number): string {
  return rating.toFixed(1).replace('.', ',');
}
