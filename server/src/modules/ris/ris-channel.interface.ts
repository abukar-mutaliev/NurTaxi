export interface RisTripPayload {
  orderId: string;
  publicNumber: string;
  regionId: string;
  status: string;
  snapshot: Record<string, unknown> | null;
  tripStartedAt: string | null;
  tripEndedAt: string | null;
}

export interface RisChannel {
  sendTrip(
    payload: RisTripPayload,
  ): Promise<{ accepted: boolean; response: Record<string, unknown> }>;
}

export const RIS_CHANNEL = Symbol('RIS_CHANNEL');
