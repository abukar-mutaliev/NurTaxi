/**
 * Снимок сведений на момент назначения водителя (FZ-04.4).
 * Последующие изменения справочников не должны менять завершённые заказы.
 */
export const HISTORICALLY_UNAVAILABLE = 'HISTORICALLY_UNAVAILABLE' as const;

export type SnapshotValue<T> = T | typeof HISTORICALLY_UNAVAILABLE | null;

export interface SnapshotDriver {
  id: string;
  fullName: string;
  phone: string | null;
}

export interface SnapshotVehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  color: string;
  year: number;
  vin: string | null;
}

export interface SnapshotCarrier {
  id: string;
  name: string;
  inn: string;
  ogrn: string;
  legalForm: string;
  address: string;
}

export interface SnapshotPermit {
  id: string;
  number: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
}

export interface AssignmentSnapshot {
  capturedAt: string;
  historicallyUnavailable?: boolean;
  driver: SnapshotValue<SnapshotDriver>;
  vehicle: SnapshotValue<SnapshotVehicle>;
  carrier: SnapshotValue<SnapshotCarrier>;
  permit: SnapshotValue<SnapshotPermit>;
  contacts: {
    driverPhone: string | null;
    clientPhone: string | null;
  };
}

export function historicallyUnavailableSnapshot(capturedAt = new Date().toISOString()): AssignmentSnapshot {
  return {
    capturedAt,
    historicallyUnavailable: true,
    driver: HISTORICALLY_UNAVAILABLE,
    vehicle: HISTORICALLY_UNAVAILABLE,
    carrier: HISTORICALLY_UNAVAILABLE,
    permit: HISTORICALLY_UNAVAILABLE,
    contacts: { driverPhone: null, clientPhone: null },
  };
}
