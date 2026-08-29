/** Производные признаки статуса верификации водителя (`§8.2`, `§12.3`). */
import {
  DocumentType,
  DriverRequirementKey,
  RequirementMode,
  VerificationStatus,
} from '@nurtaxi/shared-core/shared/model';
import type { DriverProfile, DriverRequirements } from '@nurtaxi/shared-core/shared/model';
import type { BadgeTone } from '@nurtaxi/shared-core/shared/ui';

/** Базовый комплект документов `requirements.md §8.2` — обязателен во всех регионах. */
export const REQUIRED_DOCUMENT_TYPES: readonly DocumentType[] = [
  DocumentType.Passport,
  DocumentType.License,
  DocumentType.Sts,
  DocumentType.Osago,
  DocumentType.CarPhoto,
  DocumentType.InteriorPhoto,
  DocumentType.Selfie,
];

/**
 * Комплект документов для конкретного водителя.
 *
 * Список считает сервер по требованиям региона, поэтому новый обязательный документ
 * появляется в приложении без релиза. Константа — запасной вариант для профиля,
 * который ещё не загрузился.
 */
export function requiredDocumentTypes(profile: DriverProfile | undefined): DocumentType[] {
  const fromServer = profile?.requiredDocumentTypes;
  return fromServer?.length ? [...fromServer] : [...REQUIRED_DOCUMENT_TYPES];
}

/** Режим требования в регионе водителя; по умолчанию блок не показываем. */
export function requirementMode(
  requirements: DriverRequirements | undefined,
  key: DriverRequirementKey,
): RequirementMode {
  return requirements?.[key] ?? RequirementMode.Hidden;
}

export function missingDocumentTypes(profile: DriverProfile | undefined): DocumentType[] {
  if (!profile) {
    return [...REQUIRED_DOCUMENT_TYPES];
  }
  const uploaded = new Set(
    profile.documents.filter((doc) => doc.status !== 'rejected').map((doc) => doc.type),
  );
  return requiredDocumentTypes(profile).filter((type) => !uploaded.has(type));
}

export function canSubmitForReview(profile: DriverProfile | undefined): boolean {
  if (!profile) {
    return false;
  }
  const status = profile.verificationStatus;
  const editable = status === VerificationStatus.Draft || status === VerificationStatus.Rejected;
  return editable && missingDocumentTypes(profile).length === 0;
}

export function isVerificationPending(status: VerificationStatus): boolean {
  return status === VerificationStatus.Pending || status === VerificationStatus.InReview;
}

export function verificationLabelKey(status: VerificationStatus): string {
  return `verification.${status}`;
}

export function verificationTone(status: VerificationStatus): BadgeTone {
  switch (status) {
    case VerificationStatus.Approved:
      return 'success';
    case VerificationStatus.Rejected:
      return 'danger';
    case VerificationStatus.Pending:
    case VerificationStatus.InReview:
      return 'warning';
    default:
      return 'neutral';
  }
}
