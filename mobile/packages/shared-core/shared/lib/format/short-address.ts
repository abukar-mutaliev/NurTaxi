/**
 * Краткий адрес для списков: населённый пункт, улица, дом (без региона и района).
 * Yandex и другие провайдеры часто отдают полную цепочку через запятую.
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

const LOCALITY_PREFIX = /^(?:г|город|с|село|п|пгт|пос(?:\.|елок)?|ст|станица|аул|деревня)\.?\s+/i;

const STREET_PREFIX =
  /^(?:ул|улица|пр|просп(?:\.|ект)?|пер|переулок|ш|шоссе|б-?р|бульвар|наб|набережная)\.?\s+/i;

const HOUSE_PREFIX = /^(?:д|дом|стр|строение|к|корп(?:\.|ус)?|лит|литера)\.?\s*\d/i;

function normalizePart(part: string): string {
  return part.trim().toLowerCase().replace(/ё/g, 'е');
}

function isAdminPart(part: string): boolean {
  const normalized = normalizePart(part);
  if (!normalized) {
    return true;
  }

  return ADMIN_PART_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isLocalityPart(part: string): boolean {
  const trimmed = part.trim();
  if (/^д\.?\s*\d/i.test(trimmed)) {
    return false;
  }

  return LOCALITY_PREFIX.test(trimmed);
}

function isStreetPart(part: string): boolean {
  return STREET_PREFIX.test(part.trim());
}

function isStreetLikePart(part: string): boolean {
  const trimmed = part.trim();
  if (isStreetPart(trimmed) || isHousePart(trimmed)) {
    return true;
  }

  return /\b(улица|проспект|переулок|шоссе|бульвар|набережная)\b/i.test(trimmed);
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item !== undefined && predicate(item)) {
      return index;
    }
  }

  return -1;
}

function isHousePart(part: string): boolean {
  const trimmed = part.trim();
  if (HOUSE_PREFIX.test(trimmed)) {
    return true;
  }

  return /^\d+[а-яa-z]?([/-]\d+[а-яa-z]?)?$/i.test(trimmed);
}

function splitAddressParts(address: string): string[] {
  return address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Все сегменты — регион, район, страна и т.п. */
export function isAdminOnlyAddress(address: string): boolean {
  const parts = splitAddressParts(address);
  if (parts.length === 0) {
    return true;
  }

  return parts.every(isAdminPart);
}

/** Только населённый пункт — для пошагового ввода улицы и дома. */
export function extractLocalityFromAddress(address: string): string | null {
  const short = formatShortDisplayAddress(address);
  const parts = splitAddressParts(short);
  if (parts.length === 0) {
    return null;
  }

  const locality = parts.find(isLocalityPart);
  if (locality) {
    return locality;
  }

  if (parts.some(isStreetLikePart)) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0] ?? null;
  }

  return parts.find((part) => !isStreetPart(part) && !isHousePart(part)) ?? null;
}

/** Убирает регион/район, оставляет город, улицу и дом. */
export function formatShortDisplayAddress(address: string): string {
  const source = address.trim();
  if (!source) {
    return source;
  }

  if (/^точка на карте/i.test(source)) {
    return source;
  }

  const parts = source
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    const part = parts[0];
    if (parts.length === 1 && part !== undefined && isAdminPart(part)) {
      return '';
    }

    return source;
  }

  const meaningful = parts.filter((part) => !isAdminPart(part));
  if (meaningful.length === 0) {
    return '';
  }

  if (meaningful.length <= 3) {
    return meaningful.join(', ');
  }

  const localityIndex = meaningful.findIndex(isLocalityPart);
  const houseIndex = findLastIndex(meaningful, isHousePart);

  if (localityIndex >= 0) {
    const endIndex = houseIndex > localityIndex ? houseIndex : meaningful.length - 1;
    return meaningful.slice(localityIndex, endIndex + 1).join(', ');
  }

  const locality = meaningful.find((part) => !isStreetLikePart(part) && !isHousePart(part));
  const street = meaningful.find(isStreetLikePart);
  const house = [...meaningful].reverse().find(isHousePart);

  const segments = [locality, street, house].filter((part): part is string =>
    Boolean(part?.trim()),
  );
  const unique = segments.filter((part, index) => segments.indexOf(part) === index);

  if (unique.length > 0) {
    return unique.join(', ');
  }

  return meaningful.slice(-3).join(', ');
}
