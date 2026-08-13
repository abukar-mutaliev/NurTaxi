import { Linking, Platform } from 'react-native';

import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';

async function tryOpen(url: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported && !url.startsWith('https://')) {
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Открывает Яндекс Навигатор с маршрутом до точки. Если приложения нет —
 * карты Яндекса в браузере.
 */
export async function openExternalNavigator(
  destination: GeoPoint,
  origin?: GeoPoint | null,
): Promise<boolean> {
  const latTo = destination.lat;
  const lonTo = destination.lng;
  const hasOrigin = origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng);
  const fromQuery = hasOrigin ? `&lat_from=${origin.lat}&lon_from=${origin.lng}` : '';
  const yandexApp = `yandexnavi://build_route_on_map?lat_to=${latTo}&lon_to=${lonTo}${fromQuery}`;
  const yandexMapsApp = hasOrigin
    ? `yandexmaps://maps.yandex.ru/?rtext=${origin.lat},${origin.lng}~${latTo},${lonTo}&rtt=auto`
    : `yandexmaps://maps.yandex.ru/?pt=${lonTo},${latTo}&z=16`;
  const yandexWeb = hasOrigin
    ? `https://yandex.ru/maps/?rtext=${origin.lat},${origin.lng}~${latTo},${lonTo}&rtt=auto`
    : `https://yandex.ru/maps/?rtext=~${latTo},${lonTo}&rtt=auto`;
  const geoUrl =
    Platform.OS === 'android'
      ? `geo:${latTo},${lonTo}?q=${latTo},${lonTo}`
      : `maps://?daddr=${latTo},${lonTo}&dirflg=d`;

  if (await tryOpen(yandexApp)) {
    return true;
  }
  if (await tryOpen(yandexMapsApp)) {
    return true;
  }
  if (await tryOpen(yandexWeb)) {
    return true;
  }
  return tryOpen(geoUrl);
}
