const DEFAULT_LOCALE = 'ru-RU';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatDayMonth(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

export interface HistoryTripDateLabels {
  today: (time: string) => string;
  yesterday: (time: string) => string;
  dateAt: (date: string, time: string) => string;
}

/** «Сегодня, 10:24» / «Вчера, 18:05» / «21 июля, 09:12». */
export function formatTripHistoryDate(
  iso: string,
  labels: HistoryTripDateLabels,
  locale = DEFAULT_LOCALE,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const time = formatTime(date, locale);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, now)) {
    return labels.today(time);
  }
  if (isSameDay(date, yesterday)) {
    return labels.yesterday(time);
  }
  return labels.dateAt(formatDayMonth(date, locale), time);
}

export function formatRatingStars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
}
