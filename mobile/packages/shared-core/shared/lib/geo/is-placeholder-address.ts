/**
 * Подписи GPS и точки на карте нельзя сохранять как адрес заказа.
 */
const PLACEHOLDER_PATTERNS = [
  /^мо[её]\s+местоположение$/i,
  /^my location$/i,
  /^точка на карте/i,
  /^map point\b/i,
  /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/,
];

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е');
}

export function isPlaceholderAddress(
  address: string | null | undefined,
  extraLabels: readonly string[] = [],
): boolean {
  const value = typeof address === 'string' ? address.trim() : '';
  if (!value) {
    return true;
  }

  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }

  const normalized = normalizeAddress(value);
  return extraLabels.some((label) => label.trim() && normalizeAddress(label) === normalized);
}
