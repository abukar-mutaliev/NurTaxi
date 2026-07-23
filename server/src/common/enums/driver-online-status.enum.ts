/**
 * Операционный статус водителя на линии (Req §12.3).
 * `busy` выставляется модулем заказов при активной поездке (Фаза 4).
 */
export enum DriverOnlineStatus {
  Offline = 'offline',
  Online = 'online',
  Busy = 'busy',
}
