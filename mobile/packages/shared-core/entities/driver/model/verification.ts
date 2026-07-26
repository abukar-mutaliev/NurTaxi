/** Производные признаки статуса верификации водителя (`§8.2`, `§12.3`). */
import { DocumentType, VerificationStatus } from '@nurtaxi/shared-core/shared/model';
import type { DriverProfile } from '@nurtaxi/shared-core/shared/model';
import type { BadgeTone } from '@nurtaxi/shared-core/shared/ui';

/** Полный комплект документов, требуемый `requirements.md §8.2`. */
export const REQUIRED_DOCUMENT_TYPES: readonly DocumentType[] = [
  DocumentType.Passport,
  DocumentType.License,
  DocumentType.Sts,
  DocumentType.Osago,
  DocumentType.CarPhoto,
  DocumentType.InteriorPhoto,
  DocumentType.Selfie,
];

export function missingDocumentTypes(profile: DriverProfile | undefined): DocumentType[] {
  if (!profile) {
    return [...REQUIRED_DOCUMENT_TYPES];
  }
  const uploaded = new Set(
    profile.documents.filter((doc) => doc.status !== 'rejected').map((doc) => doc.type),
  );
  return REQUIRED_DOCUMENT_TYPES.filter((type) => !uploaded.has(type));
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
