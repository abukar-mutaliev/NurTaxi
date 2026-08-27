import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import type { RegionComplianceConfig } from '../../../common/compliance/compliance-config';
import type { DriverRequirements } from '../../../common/enums/driver-requirement.enum';
import { normalizePhone } from '../../auth/phone.util';
import { ProviderType } from '../enums/provider-type.enum';
import type { CancellationPolicy } from '../../tariffs/entities/tariff.entity';
import type { SurgeRules } from '../../tariffs/entities/tariff.entity';

export class CreateRegionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ default: 'Europe/Moscow' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ default: 'RUB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, boolean>;

  @ApiPropertyOptional({
    description:
      'Режимы требований к анкете водителя. Ключи — из GET /admin/regions/driver-requirements, ' +
      'значения — hidden | optional | required',
    example: { taxi_permit: 'required' },
  })
  @IsOptional()
  @IsObject()
  driverRequirements?: Partial<DriverRequirements>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  complianceConfig?: Partial<RegionComplianceConfig>;
}

export class UpdateRegionDto extends PartialType(CreateRegionDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCityDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  centerLng?: number;
}

export class UpdateCityDto extends PartialType(CreateCityDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTariffDto {
  @ApiProperty()
  @IsUUID()
  regionId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  baseFare!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  pricePerKm!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  pricePerMin!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  surgeRules?: SurgeRules;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  cancellationPolicy?: CancellationPolicy;

  @ApiPropertyOptional({ description: 'ISO datetime; по умолчанию — сейчас' })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}

export class UpdateTariffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFare?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  surgeRules?: SurgeRules;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  cancellationPolicy?: CancellationPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProviderDto {
  @ApiProperty()
  @IsUUID()
  regionId!: string;

  @ApiProperty({ enum: ProviderType })
  @IsEnum(ProviderType)
  type!: ProviderType;

  @ApiProperty({ example: 'stub' })
  @IsString()
  @MaxLength(64)
  provider!: string;

  @ApiProperty({ description: 'Ссылка на секрет в Vault' })
  @IsString()
  @MaxLength(256)
  credentialsRef!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateProviderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentialsRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignStaffDto {
  @ApiPropertyOptional()
  @ValidateIf((dto: AssignStaffDto) => !dto.phone)
  @IsUUID()
  @IsNotEmpty()
  userId?: string;

  @ApiPropertyOptional({ description: 'Телефон пользователя в формате +7XXXXXXXXXX' })
  @ValidateIf((dto: AssignStaffDto) => !dto.userId)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizePhone(value) : value))
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ enum: [Role.Operator, Role.RegionalAdmin, Role.Regulator] })
  @IsIn([Role.Operator, Role.RegionalAdmin, Role.Regulator])
  role!: Role;

  @ApiProperty()
  @IsUUID()
  regionId!: string;
}

export class AdminAssignDriverDto {
  @ApiProperty()
  @IsUUID()
  driverId!: string;
}

export class AdminOrderStatusDto {
  @ApiProperty({ description: 'Целевой статус заказа' })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminRefundDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BlockUserDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
