export interface Region {
  id: string;
  name: string;
  isActive: boolean;
  timezone: string;
  currency: string;
  featureFlags: Record<string, boolean>;
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

export interface CreateRegionDto {
  name: string;
  timezone?: string;
  currency?: string;
  featureFlags?: Record<string, boolean>;
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
