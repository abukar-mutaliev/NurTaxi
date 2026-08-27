/**
 * Клиент при выборе GPS кладёт в `address` подпись кнопки («Моё местоположение»),
 * а не улицу. Такие значения нельзя сохранять в заказ, журнал и карточку водителя.
 */
const GPS_LABELS = new Set(['мое местоположение', 'мои местоположение', 'my location']);

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

export function isPlaceholderAddress(address: string | null | undefined): boolean {
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

  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value);
}
