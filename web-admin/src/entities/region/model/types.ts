/** Режим требования к анкете водителя в регионе (`§7.6`). */
export type RequirementMode = 'hidden' | 'optional' | 'required';

export type DriverRequirements = Record<string, RequirementMode>;

/** Справочник требований с бэкенда: форма настроек строится по нему, без правок фронта. */
export interface DriverRequirementCatalog {
  modes: RequirementMode[];
  defaults: DriverRequirements;
  requirements: Array<{
    key: string;
    label: string;
    description: string;
    documentType: string;
  }>;
}

export interface Region {
  id: string;
  name: string;
  isActive: boolean;
  timezone: string;
  currency: string;
  featureFlags: Record<string, boolean>;
  driverRequirements: DriverRequirements;
  complianceConfig?: {
    taxiRegistryRequired: boolean;
    taxiRegistryStrict: boolean;
    risTransferEnabled: boolean;
    risPayloadSchema: string;
    tripTrackIntervalSec: number;
    tripTrackRetentionDays: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  regionId: string;
  name: string;
  isActive: boolean;
  centerLat: number | null;
  centerLng: number | null;
  createdAt: string;
  updatedAt: string;
}

export type RegionComplianceConfig = NonNullable<Region['complianceConfig']>;

export interface CreateRegionDto {
  name: string;
  timezone?: string;
  currency?: string;
  featureFlags?: Record<string, boolean>;
  driverRequirements?: DriverRequirements;
  complianceConfig?: Partial<RegionComplianceConfig>;
}

export interface UpdateRegionDto extends Partial<CreateRegionDto> {
  isActive?: boolean;
}

export interface CreateCityDto {
  name: string;
  centerLat?: number;
  centerLng?: number;
}

export interface UpdateCityDto extends Partial<CreateCityDto> {
  isActive?: boolean;
}
