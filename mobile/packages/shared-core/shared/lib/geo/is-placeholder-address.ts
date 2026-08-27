/**
 * Подписи GPS и точки на карте нельзя сохранять как адрес заказа.
 */
const GPS_LABELS = new Set(['мое местоположение', 'мои местоположение', 'my location']);

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

export function isPlaceholderAddress(
  address: string | null | undefined,
  extraLabels: readonly string[] = [],
): boolean {
  const value = typeof address === 'string' ? address.trim() : '';
  if (!value) {
    return true;
  }

  const normalized = normalizeAddress(value);
  if (GPS_LABELS.has(normalized)) {
    return true;
  }

  if (normalized.startsWith('точка на карте') || normalized.startsWith('map point')) {
    return true;
  }

  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value)) {
    return true;
  }

  return extraLabels.some((label) => label.trim() && normalizeAddress(label) === normalized);
}
