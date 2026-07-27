/**
 * Адаптер провайдера карт (M3.2, `design.md §4.3`).
 *
 * Реализация на Yandex MapKit через `expo-yandex-mapkit`. Экраны и виджеты работают
 * с нашими типами (`GeoPoint`, `MapCanvasHandle`), а не с типами SDK.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

import { appConfig } from '../../../shared/config';
import type { GeoPoint } from '../../../shared/model';

export type MapPoint = { latitude: number; longitude: number };

export interface CameraPosition {
  latitude: number;
  longitude: number;
  zoom: number;
}

/**
 * Карта доступна только когда задан ключ MapKit **и** native-модуль вшит в dev-сборку
 * (`eas build` / `expo run:*` после `expo prebuild`). Expo Go и старый dev client без
 * пересборки не содержат `ExpoYandexMapKit`.
 */
export function hasMapKitApiKey(): boolean {
  return Boolean(appConfig.yandexMapKitApiKey);
}

export function hasNativeMapModule(): boolean {
  return requireOptionalNativeModule('ExpoYandexMapKit') != null;
}

export function isNativeMapAvailable(): boolean {
  return hasMapKitApiKey() && hasNativeMapModule();
}

export function toMapPoint(point: GeoPoint): MapPoint {
  return { latitude: Number(point.lat), longitude: Number(point.lng) };
}

export function isValidGeoPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  if (!point) {
    return false;
  }

  const lat = Number(point.lat);
  const lng = Number(point.lng);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function normalizeGeoPoint(point: GeoPoint): GeoPoint {
  return { lat: Number(point.lat), lng: Number(point.lng) };
}

export function fromMapPoint(point: MapPoint): GeoPoint {
  return { lat: point.latitude, lng: point.longitude };
}

/** Центр Магаса — запасной вид карты, пока не определена геопозиция (пилотный регион). */
export const DEFAULT_CAMERA: CameraPosition = {
  latitude: 43.1687,
  longitude: 44.8133,
  zoom: 12,
};

/** Перевод «дельты региона» в zoom MapKit (~0..21). */
export function deltaToZoom(latitudeDelta: number): number {
  const zoom = Math.log2(360 / Math.max(latitudeDelta, 0.0001));
  return Math.min(21, Math.max(0, Math.round(zoom)));
}

export function toCameraPosition(point: GeoPoint, zoomDelta = 0.01): CameraPosition {
  return {
    latitude: point.lat,
    longitude: point.lng,
    zoom: deltaToZoom(zoomDelta),
  };
}
