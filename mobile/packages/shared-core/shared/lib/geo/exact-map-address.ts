/**
 * Точный адрес, который карта отдала по точке: улица и дом, а не город или координаты.
 */
import {
  formatShortDisplayAddress,
  isAdminOnlyAddress,
  isExactStreetAddress,
} from '../format/short-address';
import { isPlaceholderAddress } from './is-placeholder-address';

export interface MapAddressComponent {
  name: string;
  kinds: string[];
}

/** Ответ обратного геокодинга MapKit (`SearchResult`). */
export interface MapGeocodeHit {
  name?: string | null;
  formattedAddress?: string | null;
  addressComponents?: MapAddressComponent[] | null;
}

const HOUSE_KINDS = new Set(['house', 'entrance']);

function hasKind(component: MapAddressComponent, kind: string): boolean {
  return component.kinds.some((item) => item.toLowerCase() === kind);
}

function componentName(components: MapAddressComponent[], kind: string): string {
  const match = components.find((component) => hasKind(component, kind));
  return match?.name.trim() ?? '';
}

function usableAddress(address: string): string | null {
  const short = formatShortDisplayAddress(address) || address.trim();
  if (!short || isPlaceholderAddress(short) || isAdminOnlyAddress(short)) {
    return null;
  }

  return short;
}

function addressFromComponents(components: MapAddressComponent[]): string | null {
  const house = components
    .find((component) => component.kinds.some((kind) => HOUSE_KINDS.has(kind.toLowerCase())))
    ?.name.trim();
  const street = componentName(components, 'street');
  if (!house || !street) {
    return null;
  }

  const locality =
    componentName(components, 'locality') ||
    componentName(components, 'village') ||
    componentName(components, 'district');

  return usableAddress([locality, street, house].filter(Boolean).join(', '));
}

/** `null`, если карта не назвала улицу и дом. */
export function exactAddressFromMapHit(hit: MapGeocodeHit | null | undefined): string | null {
  if (!hit) {
    return null;
  }

  const fromComponents = addressFromComponents(hit.addressComponents ?? []);
  if (fromComponents) {
    return fromComponents;
  }

  const formatted = hit.formattedAddress?.trim() || hit.name?.trim() || '';
  const short = usableAddress(formatted);
  return short && isExactStreetAddress(short) ? short : null;
}

/** Строка геокодера (сервер или MapKit) — только если в ней есть улица и дом. */
export function exactAddressFromText(address: string | null | undefined): string | null {
  const short = usableAddress(address?.trim() ?? '');
  return short && isExactStreetAddress(short) ? short : null;
}
