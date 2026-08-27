import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '../../../common/enums/document-type.enum';
import type { WorkSchedule } from '../entities/work-schedule.types';

export class VehicleDto {
  @ApiProperty({ example: 'Hyundai' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  make!: string;

  @ApiProperty({ example: 'Solaris' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  model!: string;

  @ApiProperty({ example: 'A123BC06' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  plateNumber!: string;

  @ApiProperty({ example: 'белый' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  color!: string;

  @ApiProperty({ example: 2020 })
  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  year!: number;
}

/**
 * Разрешение на деятельность такси (Req §8.2).
 * Обязательность блока задаётся для каждого региона отдельно (`regions.driver_requirements`).
 */
export class TaxiPermitDto {
  @ApiProperty({ example: 'АА-06-001234' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  number!: string;

  @ApiProperty({ example: 'Республика Ингушетия', description: 'Регион выдачи разрешения' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  issuingRegion!: string;

  @ApiProperty({ example: '2024-03-01' })
  @IsDateString()
  issuedAt!: string;

  @ApiPropertyOptional({
    example: '2029-03-01',
    description: 'Срок действия; не передаётся для бессрочного разрешения',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class RegisterDriverDto {
  @ApiProperty({ example: 'Иванова Мария Петровна' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ example: 'г. Назрань, ул. Московская, д. 1' })
  @IsString()
  @MinLength(5)
  residenceAddress!: string;

  @ApiProperty({ example: 5, description: 'Стаж вождения в годах' })
  @IsInt()
  @Min(0)
  @Max(70)
  drivingExperienceYears!: number;

  @ApiProperty({ description: 'UUID региона работы' })
  @IsUUID()
  regionId!: string;

  @ApiProperty({ type: VehicleDto })
  @ValidateNested()
  @Type(() => VehicleDto)
  vehicle!: VehicleDto;

  @ApiPropertyOptional({
    type: TaxiPermitDto,
    description: 'Обязателен, если регион требует разрешение на деятельность такси',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxiPermitDto)
  taxiPermit?: TaxiPermitDto;
}

export class PresignDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiPropertyOptional({ example: 'passport.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fileName?: string;
}

export class RegisterDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty({ description: 'Ключ объекта из ответа presign' })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  contentType!: string;
}

export class UpdateDriverStatusDto {
  @ApiProperty({ enum: ['online', 'offline'], description: 'На линии / офлайн' })
  @IsEnum(['online', 'offline'] as const)
  status!: 'online' | 'offline';
}

export class UpdateWorkScheduleDto {
  @ApiProperty({ description: 'График работы по дням недели' })
  workSchedule!: WorkSchedule;
}

export class UpdateDriverLocationDto {
  @ApiProperty({ example: 43.2167 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 44.7667 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class ModerateDocumentDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'] as const)
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Причина отклонения (обязательна при rejected)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class ListDriversQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'pending', 'in_review', 'approved', 'rejected'] })
  @IsOptional()
  @IsString()
  verificationStatus?: string;
}

export class AdminUpdateDriverVehicleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  make?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  plateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  year?: number;
}

export class AdminUpdateDriverDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(5)
  residenceAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  drivingExperienceYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ type: AdminUpdateDriverVehicleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminUpdateDriverVehicleDto)
  vehicle?: AdminUpdateDriverVehicleDto;

  @ApiPropertyOptional({ type: TaxiPermitDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxiPermitDto)
  taxiPermit?: TaxiPermitDto;
}
