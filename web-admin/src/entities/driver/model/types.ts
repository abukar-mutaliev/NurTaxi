import type { DocumentStatus, DocumentType, VerificationStatus } from '@/shared/model/enums';

export interface DriverDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  rejectionReason: string | null;
  verifiedAt: string | null;
  viewUrl?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  color: string;
  year: number;
  photoUrl: string | null;
  interiorPhotoUrl: string | null;
}

/** Разрешение на деятельность такси (`§8.2`); требуется не во всех регионах. */
export interface TaxiPermit {
  number: string;
  issuingRegion: string;
  issuedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
}

export interface DriverProfile {
  id: string;
  userId: string;
  phone: string;
  photoUrl: string | null;
  fullName: string;
  birthDate: string;
  residenceAddress: string;
  drivingExperienceYears: number;
  regionId: string;
  verificationStatus: VerificationStatus;
  onlineStatus: string;
  rating: number;
  tripsCount: number;
  balance: number;
  rejectionReason: string | null;
  vehicles: Vehicle[];
  documents: DriverDocument[];
  taxiPermit: TaxiPermit | null;
  /** Режимы требований региона: по ним карточка решает, показывать ли блок разрешения. */
  requirements: Record<string, 'hidden' | 'optional' | 'required'>;
  requiredDocumentTypes: DocumentType[];
  canGoOnline: boolean;
  accountStatus: string;
}

export interface ModerateDocumentDto {
  status: DocumentStatus;
  rejectionReason?: string;
}

export interface UpdateDriverDto {
  fullName?: string;
  birthDate?: string;
  residenceAddress?: string;
  drivingExperienceYears?: number;
  regionId?: string;
  vehicle?: {
    make?: string;
    model?: string;
    plateNumber?: string;
    color?: string;
    year?: number;
  };
}
