/**
 * Текущий заказ водителя.
 *
 * Отдельного «мой активный заказ» сервер не отдаёт, а приложение его не запоминало: после
 * перезапуска водитель попадал на экран смены с надписью «Вы офлайн», хотя сервер держал
 * его занятым (`busy`) на принятом заказе. Выйти на линию или уйти с неё в этом статусе
 * нельзя (`DRIVER_BUSY`), а до заказа можно было добраться только через историю.
 *
 * Поэтому, пока сервер считает водителя занятым, ищем активный заказ в начале истории.
 */
import {
  useGetDriverOrderHistoryQuery,
  useGetDriverProfileQuery,
} from '@nurtaxi/shared-core/entities/driver';
import { isActiveOrder } from '@nurtaxi/shared-core/entities/order';
import { DriverOnlineStatus, type Order } from '@nurtaxi/shared-core/shared/model';

/** Активный заказ всегда среди последних — длинная история здесь не нужна. */
const RECENT_ORDERS = 10;

export interface CurrentDriverOrder {
  /** Сервер держит водителя на заказе. */
  isBusy: boolean;
  order: Order | null;
  isLoading: boolean;
}

export function useCurrentDriverOrder(): CurrentDriverOrder {
  const { data: profile } = useGetDriverProfileQuery();
  const isBusy = profile?.onlineStatus === DriverOnlineStatus.Busy;

  const { data: history, isLoading } = useGetDriverOrderHistoryQuery(
    { limit: RECENT_ORDERS },
    // Статус меняется при принятии и завершении заказа — каждый раз берём свежую историю.
    { refetchOnMountOrArgChange: true, skip: !isBusy },
  );

  const order = isBusy
    ? (history?.find((item) => isActiveOrder(item.order.status))?.order ?? null)
    : null;

  return { isBusy, order, isLoading: isBusy && isLoading };
}
