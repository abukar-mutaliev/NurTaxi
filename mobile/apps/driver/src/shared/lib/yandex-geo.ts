/**
 * Реэкспорт: реализация в `@nurtaxi/shared-core`, чтобы клиент и водитель
 * искали адреса через один MapKit Suggest без географической рамки.
 */
export {
  buildDrivingRoute,
  isYandexGeoAvailable,
  resolveSuggestionPoint,
  reverseGeocode,
  suggestAddresses,
} from '@nurtaxi/shared-core/shared/lib/yandex-geo';
export type {
  SuggestAddressesOptions,
  YandexRoute,
  YandexSuggestion,
} from '@nurtaxi/shared-core/shared/lib/yandex-geo';
