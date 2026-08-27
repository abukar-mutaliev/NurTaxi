import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  resolveDriverRequirements,
  type DriverRequirements,
} from '../../../common/enums/driver-requirement.enum';
import {
  resolveComplianceConfig,
  type RegionComplianceConfig,
} from '../../../common/compliance/compliance-config';
import type { City } from '../entities/city.entity';
import type { Region } from '../entities/region.entity';

export class RegionResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  featureFlags!: Record<string, boolean>;

  @ApiProperty({
    description: 'Режимы региональных требований к анкете водителя (hidden/optional/required)',
  })
  driverRequirements!: DriverRequirements;

  @ApiProperty()
  complianceConfig!: RegionComplianceConfig;

  static from(region: Region): RegionResponse {
    return {
      id: region.id,
      name: region.name,
      timezone: region.timezone,
      currency: region.currency,
      featureFlags: region.featureFlags ?? {},
      driverRequirements: resolveDriverRequirements(region.driverRequirements),
      complianceConfig: resolveComplianceConfig(region.complianceConfig),
    };
  }
}

export class CityResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  centerLat!: number | null;

  @ApiPropertyOptional()
  centerLng!: number | null;

  static from(city: City): CityResponse {
    return {
      id: city.id,
      name: city.name,
      centerLat: city.centerLat,
      centerLng: city.centerLng,
    };
  }
}
