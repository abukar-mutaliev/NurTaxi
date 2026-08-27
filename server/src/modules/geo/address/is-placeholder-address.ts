/**
 * Клиент при выборе GPS кладёт в `address` подпись кнопки («Моё местоположение»),
 * а не улицу. Такие значения нельзя сохранять в заказ, журнал и карточку водителя.
 */
const PLACEHOLDER_PATTERNS = [
  /^мо[её]\s+местоположение$/i,
  /^my location$/i,
  /^точка на карте/i,
  /^map point\b/i,
  /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/,
];

export function isPlaceholderAddress(address: string | null | undefined): boolean {
  const value = typeof address === 'string' ? address.trim() : '';
  if (!value) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}
