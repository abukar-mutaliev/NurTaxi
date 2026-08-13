import { i18n } from '../../i18n';
import type { GeoLocation } from '../../model';

/** Только поля, которые принимает API (`GeoLocationDto`). */
export function toApiGeoLocation(location: GeoLocation & { label?: string | null }): GeoLocation {
  const address = location.address?.trim();

  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
    ...(address ? { address } : {}),
  };
}

/**
 * Точка для создания заказа: без подписей интерфейса.
 *
 * «Моё местоположение» — ярлык для пассажира, а не адрес: точку подачи приложение
 * подставляет по GPS и настоящего адреса не знает. Уехав в заказ, эта строка попадала
 * водителю вместо адреса клиента, а заодно в историю, к оператору и в чек. Адрес по
 * координатам восстановит сервер.
 *
 * Отдельно от `toApiGeoLocation` намеренно: та же функция собирает черновик заказа, и
 * вычистить из него ярлык — значит оставить поле «Откуда» пустым на глазах у пассажира.
 */
export function toOrderGeoLocation(location: GeoLocation & { label?: string | null }): GeoLocation {
  const normalized = toApiGeoLocation(location);

  if (normalized.address && normalized.address === i18n.t('addresses.myLocation')) {
    const { address: _dropped, ...withoutAddress } = normalized;
    return withoutAddress;
  }

  return normalized;
}
