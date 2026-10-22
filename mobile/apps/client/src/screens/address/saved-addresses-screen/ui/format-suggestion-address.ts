import {
  extractLocalityFromAddress,
  formatShortDisplayAddress,
  isAdminOnlyAddress,
} from '@nurtaxi/shared-core/shared/lib';
import type { AddressSuggestion, GeoLocation } from '@nurtaxi/shared-core/shared/model';

/** Адрес для сохранения в избранное: без региона и района. */
export function formatSaveAddressText(address: string | null | undefined): string {
  return formatShortDisplayAddress(address);
}

const STREET_PREFIX =
  /^(?:ул|улица|пр|просп(?:\.|ект)?|пер|переулок|ш|шоссе|б-?р|бульвар|наб|набережная)\.?\s+/i;
const HOUSE_PREFIX = /^(?:д|дом|стр|строение|к|корп(?:\.|ус)?|лит|литера)\.?\s*\d/i;

function splitParts(address: string): string[] {
  return address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function isHousePart(part: string): boolean {
  const trimmed = part.trim();
  if (HOUSE_PREFIX.test(trimmed)) {
    return true;
  }

  return /^\d+[а-яa-z]?([/-]\d+[а-яa-z]?)?$/i.test(trimmed);
}

function isStreetLikePart(part: string): boolean {
  const trimmed = part.trim();
  if (STREET_PREFIX.test(trimmed) || isHousePart(trimmed)) {
    return true;
  }

  return /\b(улица|проспект|переулок|шоссе|бульвар|набережная)\b/i.test(trimmed);
}

function hasStreetOrHouseInShort(address: string): boolean {
  return splitParts(address).some((part) => isStreetLikePart(part));
}

function scoreShortAddress(address: string): number {
  const parts = splitParts(address);
  let score = parts.length;

  if (hasStreetOrHouseInShort(address)) {
    score += 10;
  }

  return score;
}

function buildSuggestionCandidates(
  item: Pick<AddressSuggestion, 'address' | 'subtitle' | 'title'>,
): string[] {
  const subtitle = item.subtitle?.trim();
  const title = item.title?.trim();
  const address = item.address?.trim();
  // Подпись идёт от узкого к широкому («Торунь, … воеводство, Польша»), полный адрес — наоборот.
  // Разворачиваем подпись, чтобы город оказался рядом с улицей, как в полном адресе.
  const subtitleWideFirst = subtitle ? splitParts(subtitle).reverse().join(', ') : '';

  return [
    address,
    [subtitleWideFirst, title].filter(Boolean).join(', '),
    [title, subtitle].filter(Boolean).join(', '),
    title,
    subtitle,
  ].filter(Boolean) as string[];
}

function resolveShortSuggestionAddress(
  item: Pick<AddressSuggestion, 'address' | 'subtitle' | 'title'>,
): string {
  let best = '';
  let bestScore = -1;

  for (const candidate of buildSuggestionCandidates(item)) {
    const short = formatSaveAddressText(candidate);
    if (!short || isAdminOnlyAddress(short)) {
      continue;
    }

    const score = scoreShortAddress(short);
    if (score > bestScore) {
      bestScore = score;
      best = short;
    }
  }

  return best || (item.title?.trim() ?? '');
}

/** Текст для списка подсказок. */
export function formatSuggestionDisplayText(
  item: Pick<AddressSuggestion, 'address' | 'subtitle' | 'title'>,
): string {
  return resolveShortSuggestionAddress(item);
}

function suggestionTitle(item: Pick<AddressSuggestion, 'address' | 'subtitle' | 'title'>): string {
  return item.title?.trim() || item.subtitle?.trim() || item.address?.trim() || '';
}

function buildInitialInsertText(item: AddressSuggestion, short: string): string {
  if (!short) {
    return suggestionTitle(item);
  }

  const parts = splitParts(short);

  if (parts.length > 1 || hasStreetOrHouseInShort(short)) {
    return short;
  }

  if (isStreetLikePart(parts[0] ?? '')) {
    return short;
  }

  return extractLocalityFromAddress(short) ?? short;
}

/**
 * Текст для вставки в поле поиска — только из самой подсказки.
 *
 * Раньше к улице из подсказки приписывался населённый пункт, набранный пассажиром. Если
 * подсказка была из другого города (в Торуне тоже есть улица Юрия Гагарина), в поле
 * оказывалось «село Экажево, улица Юрия Гагарина, 20» с координатами Польши — и маршрут
 * на 3 000 км выглядел как поездка по селу. Текст должен описывать ту точку, чьи
 * координаты уйдут в заказ.
 */
export function formatSuggestionInsertText(item: AddressSuggestion): string {
  return buildInitialInsertText(item, resolveShortSuggestionAddress(item));
}

export function geoLocationForSave(location: GeoLocation): GeoLocation {
  const address = location.address?.trim() ?? '';
  if (!address) {
    return location;
  }

  return { ...location, address: formatSaveAddressText(address) };
}

export function suggestionToGeoLocationForSave(item: AddressSuggestion): GeoLocation {
  return geoLocationForSave(suggestionToGeoLocation(item));
}

export function formatSuggestionAddress(
  item: Pick<AddressSuggestion, 'address' | 'subtitle' | 'title'>,
): string {
  const address = item.address?.trim();
  if (address) {
    return address;
  }

  const subtitle = item.subtitle?.trim();
  if (subtitle) {
    return subtitle;
  }

  return item.title?.trim() ?? '';
}

export function suggestionToGeoLocation(item: AddressSuggestion): GeoLocation {
  const address = formatSuggestionInsertText(item);

  return {
    lat: item.lat,
    lng: item.lng,
    address,
  };
}
