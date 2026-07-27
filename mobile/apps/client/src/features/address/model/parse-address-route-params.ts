import type { AddressField, AddressMode } from './use-address-selection';

export function parseRouteParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseAddressFieldParam(value: string | string[] | undefined): AddressField {
  return parseRouteParam(value) === 'pickup' ? 'pickup' : 'dropoff';
}

export function parseAddressModeParam(value: string | string[] | undefined): AddressMode {
  const param = parseRouteParam(value);
  if (param === 'save') {
    return 'save';
  }
  if (param === 'edit') {
    return 'edit';
  }
  return 'order';
}
