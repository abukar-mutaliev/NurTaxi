import { useRealtimeConnection, useStaffRealtimeEvents } from '../model/use-realtime';

export function RealtimeProvider() {
  useRealtimeConnection();
  useStaffRealtimeEvents();
  return null;
}
