/**
 * Требования к анкете водителя, включаемые отдельно для каждого региона (Req §7.6, §8.2).
 *
 * Режим хранится в `regions.driver_requirements` и отдаётся клиенту вместе с регионом,
 * поэтому включение требования в новом регионе делается из админ-панели, без релиза приложений.
 */
import { DocumentType, REQUIRED_DOCUMENT_TYPES } from './document-type.enum';

export enum DriverRequirementKey {
  /** Разрешение на осуществление деятельности по перевозке пассажиров легковым такси. */
  TaxiPermit = 'taxi_permit',
}

export enum RequirementMode {
  /** Блок скрыт: не показывается в анкете и не проверяется. */
  Hidden = 'hidden',
  /** Блок показывается, но не блокирует отправку анкеты на проверку. */
  Optional = 'optional',
  /** Блок обязателен: без него анкету нельзя отправить на проверку. */
  Required = 'required',
}

export type DriverRequirements = Record<DriverRequirementKey, RequirementMode>;

/**
 * Режим по умолчанию для регионов, где требование ещё не настроено.
 * `optional` — водитель видит блок и может его заполнить, но регистрация не блокируется;
 * регион переключают в `required`, когда готовы проверять разрешения.
 */
export const DEFAULT_DRIVER_REQUIREMENTS: DriverRequirements = {
  [DriverRequirementKey.TaxiPermit]: RequirementMode.Optional,
};

/** Документ, который требование добавляет к комплекту на проверку. */
export const REQUIREMENT_DOCUMENT_TYPE: Record<DriverRequirementKey, DocumentType> = {
  [DriverRequirementKey.TaxiPermit]: DocumentType.TaxiPermit,
};

/** Описание требований для админ-панели: форма настроек строится по этому списку. */
export const DRIVER_REQUIREMENT_CATALOG: ReadonlyArray<{
  key: DriverRequirementKey;
  label: string;
  description: string;
  documentType: DocumentType;
}> = [
  {
    key: DriverRequirementKey.TaxiPermit,
    label: 'Разрешение на деятельность такси',
    description:
      'Номер разрешения, регион выдачи, дата выдачи, срок действия и скан подтверждающего документа.',
    documentType: DocumentType.TaxiPermit,
  },
];

const REQUIREMENT_KEYS = Object.values(DriverRequirementKey);
const REQUIREMENT_MODES = Object.values(RequirementMode);

/**
 * Приводит значение из jsonb к полной карте требований: неизвестные ключи и режимы
 * отбрасываются, отсутствующие добираются из умолчаний.
 */
export function resolveDriverRequirements(stored?: unknown): DriverRequirements {
  const raw = (stored ?? {}) as Record<string, unknown>;
  const resolved = { ...DEFAULT_DRIVER_REQUIREMENTS };

  for (const key of REQUIREMENT_KEYS) {
    const mode = raw[key];
    if (typeof mode === 'string' && REQUIREMENT_MODES.includes(mode as RequirementMode)) {
      resolved[key] = mode as RequirementMode;
    }
  }

  return resolved;
}

export function isRequirementEnabled(
  requirements: DriverRequirements,
  key: DriverRequirementKey,
): boolean {
  return requirements[key] !== RequirementMode.Hidden;
}

export function isRequirementMandatory(
  requirements: DriverRequirements,
  key: DriverRequirementKey,
): boolean {
  return requirements[key] === RequirementMode.Required;
}

/** Комплект документов для отправки на проверку с учётом региональных требований. */
export function requiredDocumentTypesFor(requirements: DriverRequirements): DocumentType[] {
  const extra = REQUIREMENT_KEYS.filter((key) => isRequirementMandatory(requirements, key)).map(
    (key) => REQUIREMENT_DOCUMENT_TYPE[key],
  );
  return [...REQUIRED_DOCUMENT_TYPES, ...extra];
}
