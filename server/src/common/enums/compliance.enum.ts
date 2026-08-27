/** Статус перевозчика в реестре службы заказа (FZ-04.1). */
export enum CarrierStatus {
  Draft = 'draft',
  Active = 'active',
  Suspended = 'suspended',
  Archived = 'archived',
}

/** Статус разрешения на перевозку легковым такси (FZ-04.2). */
export enum PermitStatus {
  Draft = 'draft',
  Active = 'active',
  Expiring = 'expiring',
  Expired = 'expired',
  Revoked = 'revoked',
}

/** Исход предложения заказа водителю (FZ-04.6). */
export enum OfferOutcome {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Timeout = 'timeout',
  Superseded = 'superseded',
  Cancelled = 'cancelled',
}

/** Полнота обязательных сведений о заказе (FZ-04.9). */
export enum CompletenessStatus {
  Pending = 'pending',
  Complete = 'complete',
  Incomplete = 'incomplete',
  HistoricallyUnavailable = 'historically_unavailable',
}

/** Назначение площадки размещения (FZ-09.1). */
export enum PlacementPurpose {
  Compute = 'compute',
  Database = 'database',
  ObjectStorage = 'object_storage',
  Logs = 'logs',
  Backups = 'backups',
  Registry = 'registry',
  Observability = 'observability',
}

/** Вердикт проверки в государственном реестре такси (FZ-06.4). */
export enum RegistryVerdict {
  Valid = 'valid',
  Invalid = 'invalid',
  NotFound = 'not_found',
  Unavailable = 'unavailable',
  Unconfirmed = 'unconfirmed',
}

export enum RegistrySubjectType {
  Carrier = 'carrier',
  Permit = 'permit',
  Vehicle = 'vehicle',
}

/** Статус асинхронной регуляторной выгрузки (FZ-05.5). */
export enum ExportStatus {
  Queued = 'queued',
  Running = 'running',
  Ready = 'ready',
  Failed = 'failed',
  Expired = 'expired',
}

export enum ExportFormat {
  Csv = 'csv',
  Json = 'json',
}

export enum ExportDateField {
  Created = 'created',
  Completed = 'completed',
}

/** Канал гарантированной доставки (C8.1). */
export enum OutboxChannel {
  Payments = 'payments',
  Ris = 'ris',
}

export enum AuthEventType {
  LoginSuccess = 'login_success',
  LoginFailure = 'login_failure',
  TokenRefresh = 'token_refresh',
  TokenRevoke = 'token_revoke',
  Logout = 'logout',
}
