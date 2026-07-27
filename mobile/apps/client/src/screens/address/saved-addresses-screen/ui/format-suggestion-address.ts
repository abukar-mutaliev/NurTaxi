import {
  extractLocalityFromAddress,
  formatShortDisplayAddress,
  isAdminOnlyAddress,
} from '@nurtaxi/shared-core/shared/lib';
import type { AddressSuggestion, GeoLocation } from '@nurtaxi/shared-core/shared/model';

/** Адрес для сохранения в избранное: без региона и района. */
export function formatSaveAddressText(address: string): string {
  return formatShortDisplayAddress(address);
}

const LOCALITY_PREFIX = /^(?:г|город|с|село|п|пгт|пос(?:\.|елок)?|ст|станица|аул|деревня)\.?\s+/i;

const STREET_PREFIX =
  /^(?:ул|улица|пр|просп(?:\.|ект)?|пер|переулок|ш|шоссе|б-?р|бульвар|наб|набережная)\.?\s+/i;
const HOUSE_PREFIX = /^(?:д|дом|стр|строение|к|корп(?:\.|ус)?|лит|литера)\.?\s*\d/i;

function splitParts(address: string): string[] {
  return address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function isLocalityPart(part: string): boolean {
  return LOCALITY_PREFIX.test(part.trim());
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

function extractStreetAndHouseFromAddress(address: string): string | null {
  const parts = splitParts(formatShortDisplayAddress(address));
  const segments = parts.filter((part) => isStreetLikePart(part));
  if (segments.length === 0) {
    return null;
  }

  return segments.join(', ');
}

function buildSuggestionCandidates(
  item: Pick<AddressSuggestion, 'address' | 'subtitle' | 'title'>,
): string[] {
  const subtitle = item.subtitle?.trim();
  const title = item.title?.trim();
  const address = item.address?.trim();

  return [
    address,
    [subtitle, title].filter(Boolean).join(', '),
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

function buildInitialInsertText(item: AddressSuggestion, short: string): string {
  if (!short) {
    return item.title.trim();
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

function mergeAddressWithSuggestion(
  currentQuery: string,
  item: AddressSuggestion,
  suggestionText: string,
): string {
  const current = currentQuery.trim();
  const suggestion = suggestionText.trim();

  if (!suggestion) {
    return current;
  }

  if (!current) {
    return suggestion;
  }

  const currentLocality = extractLocalityFromAddress(current) ?? splitParts(current)[0] ?? current;
  const suggestionLocality = extractLocalityFromAddress(suggestion);
  const suggestionHasStreet = hasStreetOrHouseInShort(suggestion);

  if (suggestionHasStreet && suggestionLocality) {
    return suggestion;
  }

  if (suggestionHasStreet) {
    const streetSegment = extractStreetAndHouseFromAddress(suggestion) ?? suggestion;
    return `${currentLocality}, ${streetSegment}`;
  }

  const title = item.title.trim();
  const titleLooksLikeStreet =
    isStreetLikePart(title) ||
    STREET_PREFIX.test(title) ||
    (/\d/.test(title) && !isLocalityPart(title));

  if (titleLooksLikeStreet && currentLocality && title !== currentLocality) {
    return `${currentLocality}, ${title}`;
  }

  if (currentLocality && suggestion !== currentLocality && !isLocalityPart(suggestion)) {
    return `${currentLocality}, ${suggestion}`;
  }

  if (current.length >= suggestion.length) {
    return current;
  }

  return suggestion;
}

/**
 * Текст для вставки в поле поиска.
 * Учитывает уже введённый текст (например, город + дописываемая улица).
 */
export function formatSuggestionInsertText(item: AddressSuggestion, currentQuery = ''): string {
  const short = resolveShortSuggestionAddress(item);
  const trimmedQuery = currentQuery.trim();
  const suggestionText = buildInitialInsertText(item, short);

  if (!trimmedQuery) {
    return suggestionText;
  }

  return mergeAddressWithSuggestion(trimmedQuery, item, suggestionText);
}

export function geoLocationForSave(location: GeoLocation): GeoLocation {
  const address = location.address?.trim() ?? '';
  if (!address) {
    return location;
  }

  return { ...location, address: formatSaveAddressText(address) };
}

export function suggestionToGeoLocationForSave(
  item: AddressSuggestion,
  currentQuery = '',
): GeoLocation {
  return geoLocationForSave(suggestionToGeoLocation(item, currentQuery));
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

export function suggestionToGeoLocation(item: AddressSuggestion, currentQuery = ''): GeoLocation {
  const address = formatSuggestionInsertText(item, currentQuery);

  return {
    lat: item.lat,
    lng: item.lng,
    address,
  };
}
