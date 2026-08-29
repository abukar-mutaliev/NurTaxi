/**
 * Региональная конфигурация соответствия 580-ФЗ.
 * Хранится в `regions.compliance_config`; недостающие ключи добираются из умолчаний.
 */
export interface RegionComplianceConfig {
  /** Водитель без подтверждённого разрешения не выходит на линию (FZ-06.3). */
  taxiRegistryRequired: boolean;
  /** При недоступности реестра отказывать, а не помечать как неподтверждённое (FZ-06.6). */
  taxiRegistryStrict: boolean;
  /** Формировать события передачи в региональную ИС (FZ-07.5). */
  risTransferEnabled: boolean;
  /** Имя схемы состава передаваемых сведений (FZ-07.6). */
  risPayloadSchema: string;
  /** Интервал записи точек трека, секунды (FZ-07.4). */
  tripTrackIntervalSec: number;
  /**
   * Срок хранения трека в днях. По умолчанию 180 (согласовано с журналом заказов),
   * пока не закрыт открытый вопрос B.5.
   */
  tripTrackRetentionDays: number;
}

export const DEFAULT_COMPLIANCE_CONFIG: RegionComplianceConfig = {
  taxiRegistryRequired: false,
  taxiRegistryStrict: false,
  risTransferEnabled: false,
  risPayloadSchema: 'default',
  tripTrackIntervalSec: 15,
  tripTrackRetentionDays: 180,
};

export function resolveComplianceConfig(stored?: unknown): RegionComplianceConfig {
  const raw = (stored ?? {}) as Record<string, unknown>;
  return {
    taxiRegistryRequired:
      typeof raw.taxiRegistryRequired === 'boolean'
        ? raw.taxiRegistryRequired
        : DEFAULT_COMPLIANCE_CONFIG.taxiRegistryRequired,
    taxiRegistryStrict:
      typeof raw.taxiRegistryStrict === 'boolean'
        ? raw.taxiRegistryStrict
        : DEFAULT_COMPLIANCE_CONFIG.taxiRegistryStrict,
    risTransferEnabled:
      typeof raw.risTransferEnabled === 'boolean'
        ? raw.risTransferEnabled
        : DEFAULT_COMPLIANCE_CONFIG.risTransferEnabled,
    risPayloadSchema:
      typeof raw.risPayloadSchema === 'string' && raw.risPayloadSchema.length > 0
        ? raw.risPayloadSchema
        : DEFAULT_COMPLIANCE_CONFIG.risPayloadSchema,
    tripTrackIntervalSec:
      typeof raw.tripTrackIntervalSec === 'number' && raw.tripTrackIntervalSec > 0
        ? raw.tripTrackIntervalSec
        : DEFAULT_COMPLIANCE_CONFIG.tripTrackIntervalSec,
    tripTrackRetentionDays:
      typeof raw.tripTrackRetentionDays === 'number' && raw.tripTrackRetentionDays > 0
        ? raw.tripTrackRetentionDays
        : DEFAULT_COMPLIANCE_CONFIG.tripTrackRetentionDays,
  };
}

/** Минимальный срок хранения сведений о заказе, месяцы (FZ-03.1). */
export const MIN_ORDER_RETENTION_MONTHS = 6;
