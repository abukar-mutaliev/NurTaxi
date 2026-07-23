import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '../../../common/enums/document-status.enum';
import { DocumentType } from '../../../common/enums/document-type.enum';
import { DriverOnlineStatus } from '../../../common/enums/driver-online-status.enum';
import { VerificationStatus } from '../../../common/enums/verification-status.enum';
import type { DriverDocument } from '../entities/driver-document.entity';
import type { DriverProfile } from '../entities/driver-profile.entity';
import type { Vehicle } from '../entities/vehicle.entity';
import type { WorkSchedule } from '../entities/work-schedule.types';

export class VehicleResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  make!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  plateNumber!: string;

  @ApiProperty()
  color!: string;

  @ApiProperty()
  year!: number;

  @ApiPropertyOptional()
  photoUrl!: string | null;

  @ApiPropertyOptional()
  interiorPhotoUrl!: string | null;

  static from(vehicle: Vehicle): VehicleResponse {
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      color: vehicle.color,
      year: vehicle.year,
      photoUrl: vehicle.photoUrl,
      interiorPhotoUrl: vehicle.interiorPhotoUrl,
    };
  }
}

export class DriverDocumentResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: DocumentType })
  type!: DocumentType;

  @ApiProperty({ enum: DocumentStatus })
  status!: DocumentStatus;

  @ApiPropertyOptional()
  rejectionReason!: string | null;

  @ApiPropertyOptional()
  verifiedAt!: string | null;

  @ApiPropertyOptional({ description: 'Краткоживущий URL для просмотра (если запрошен)' })
  viewUrl?: string;

  static from(document: DriverDocument, viewUrl?: string): DriverDocumentResponse {
    return {
      id: document.id,
      type: document.type,
      status: document.status,
      rejectionReason: document.rejectionReason,
      verifiedAt: document.verifiedAt?.toISOString() ?? null,
      ...(viewUrl ? { viewUrl } : {}),
    };
  }
}

export class DriverProfileResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  photoUrl!: string | null;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  birthDate!: string;

  @ApiProperty()
  residenceAddress!: string;

  @ApiProperty()
  drivingExperienceYears!: number;

  @ApiProperty()
  regionId!: string;

  @ApiProperty({ enum: VerificationStatus })
  verificationStatus!: VerificationStatus;

  @ApiProperty({ enum: DriverOnlineStatus })
  onlineStatus!: DriverOnlineStatus;

  @ApiProperty()
  rating!: number;

  @ApiProperty()
  tripsCount!: number;

  @ApiProperty()
  balance!: number;

  @ApiPropertyOptional()
  rejectionReason!: string | null;

  @ApiProperty()
  workSchedule!: WorkSchedule;

  @ApiProperty({ type: [VehicleResponse] })
  vehicles!: VehicleResponse[];

  @ApiProperty({ type: [DriverDocumentResponse] })
  documents!: DriverDocumentResponse[];

  @ApiProperty()
  canGoOnline!: boolean;

  static from(
    profile: DriverProfile,
    documents: DriverDocumentResponse[] = [],
  ): DriverProfileResponse {
    const primaryVehicle = profile.vehicles?.find((v) => v.isPrimary) ?? profile.vehicles?.[0];

    return {
      id: profile.id,
      userId: profile.userId,
      phone: profile.user?.phone ?? '',
      photoUrl: profile.user?.photoUrl ?? null,
      fullName: profile.fullName,
      birthDate: profile.birthDate,
      residenceAddress: profile.residenceAddress,
      drivingExperienceYears: profile.drivingExperienceYears,
      regionId: profile.regionId,
      verificationStatus: profile.verificationStatus,
      onlineStatus: profile.onlineStatus,
      rating: Number(profile.rating),
      tripsCount: profile.tripsCount,
      balance: Number(profile.balance),
      rejectionReason: profile.rejectionReason,
      workSchedule: profile.workSchedule ?? {},
      vehicles: primaryVehicle ? [VehicleResponse.from(primaryVehicle)] : [],
      documents,
      canGoOnline: profile.verificationStatus === VerificationStatus.Approved,
    };
  }
}

export class DriverEarningsResponse {
  @ApiProperty()
  balance!: number;

  @ApiProperty({ description: 'Доход за сегодня (заполняется в Фазе 6)' })
  today!: number;

  @ApiProperty()
  week!: number;

  @ApiProperty()
  month!: number;
}

export class RegionResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  currency!: string;
}
