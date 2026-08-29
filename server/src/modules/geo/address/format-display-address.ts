/**
 * Краткий адрес для хранения в заказе: город, улица, дом без страны и региона.
 */
const ADMIN_PART_PATTERNS = [
  /^россия$/i,
  /^russia$/i,
  /республика/i,
  /область/i,
  /\bкрай$/i,
  /район/i,
  /округ/i,
  /федеральн/i,
];

export function formatDisplayAddress(address: string | null | undefined): string {
  const source = typeof address === 'string' ? address.trim() : '';
  if (!source) {
    return '';
  }

  const parts = source
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const meaningful = parts.filter((part) => {
    const normalized = part.toLowerCase().replace(/ё/g, 'е');
    return !ADMIN_PART_PATTERNS.some((pattern) => pattern.test(normalized));
  });

  if (meaningful.length === 0) {
    return source;
  }

  if (meaningful.length <= 3) {
    return meaningful.join(', ');
  }

  return meaningful.slice(-3).join(', ');
}
