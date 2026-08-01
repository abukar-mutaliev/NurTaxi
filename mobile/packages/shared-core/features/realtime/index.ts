export { realtimeClient } from './model/realtime-client';
export { RealtimeEvent } from './model/realtime-events';
export type {
  ClientToServerEvents,
  DriverLocationEvent,
  OrderOfferEvent,
  OrderStatusEvent,
  RealtimeStatus,
  ServerToClientEvents,
  SosActivatedEvent,
} from './model/realtime-events';
export {
  driverPositionReceived,
  realtimeReducer,
  realtimeReset,
  realtimeSlice,
  realtimeStatusChanged,
  selectDriverPosition,
  selectIsRealtimeOnline,
  selectLastSos,
  selectRealtimeStatus,
  sosReceived,
} from './model/realtime.slice';
export type { DriverPosition, RealtimeState, WithRealtimeState } from './model/realtime.slice';
export { useOrderRealtime, useRealtimeConnection } from './model/use-realtime';
export type { OrderRealtimeHandlers } from './model/use-realtime';
