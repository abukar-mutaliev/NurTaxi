/**
 * Адаптер провайдера карт (M3.2, `design.md §4.3`).
 *
 * Сейчас используется `react-native-maps` (Google на Android, Apple Maps на iOS).
 * Когда для региона понадобится Яндекс или 2ГИС, меняется только этот модуль и реализация
 * `MapCanvas` — экраны и виджеты работают с нашими типами, а не с типами библиотеки.
 */
import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import type { LatLng, Region as MapRegion } from 'react-native-maps';

import { appConfig } from '@nurtaxi/shared-core/shared/config';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

/** Без ключа Google Maps на Android native MapView падает при инициализации. */
export function isNativeMapAvailable(): boolean {
  return Platform.OS !== 'android' || appConfig.googleMapsApiKeyConfigured;
}

export function getMapProvider(): typeof PROVIDER_GOOGLE | typeof PROVIDER_DEFAULT {
  // На iOS Apple Maps не требует API-ключа и лучше работает офлайн.
  return Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
}

export function toLatLng(point: GeoPoint): LatLng {
  return { latitude: point.lat, longitude: point.lng };
}

export function fromLatLng(point: LatLng): GeoPoint {
  return { lat: point.latitude, lng: point.longitude };
}

/** Центр Магаса — запасной вид карты, пока не определена геопозиция (пилотный регион). */
export const DEFAULT_REGION: MapRegion = {
  latitude: 43.1687,
  longitude: 44.8133,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function toMapRegion(point: GeoPoint, zoomDelta = 0.01): MapRegion {
  return {
    latitude: point.lat,
    longitude: point.lng,
    latitudeDelta: zoomDelta,
    longitudeDelta: zoomDelta,
  };
}
