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
