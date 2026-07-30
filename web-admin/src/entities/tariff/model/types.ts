export interface SurgeRules {
  enabled?: boolean;
  multiplier?: number;
}

export interface CancellationPolicy {
  freeCancelBeforeAssigned?: boolean;
  feeAfterAssigned?: number;
  feeAfterArrived?: number;
}

export interface Tariff {
  id: string;
  regionId: string;
  name: string;
  baseFare: string;
  pricePerKm: string;
  pricePerMin: string;
  minPrice: string;
  surgeRules: SurgeRules;
  commissionPercent: string;
  cancellationPolicy: CancellationPolicy;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTariffDto {
  regionId: string;
  name: string;
  baseFare: number;
  pricePerKm: number;
  pricePerMin: number;
  minPrice: number;
  commissionPercent?: number;
  surgeRules?: SurgeRules;
  cancellationPolicy?: CancellationPolicy;
  effectiveFrom?: string;
}

export interface UpdateTariffDto {
  name?: string;
  baseFare?: number;
  pricePerKm?: number;
  pricePerMin?: number;
  minPrice?: number;
  commissionPercent?: number;
  surgeRules?: SurgeRules;
  cancellationPolicy?: CancellationPolicy;
  effectiveFrom?: string;
  isActive?: boolean;
}
