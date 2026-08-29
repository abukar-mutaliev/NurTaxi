import { RegistrySubjectType, RegistryVerdict } from '../../common/enums/compliance.enum';

export interface RegistryCheckRequest {
  subjectType: RegistrySubjectType;
  subjectId: string;
  regionId: string;
  inn?: string;
  permitNumber?: string;
  plateNumber?: string;
  vin?: string;
}

export interface RegistryCheckResult {
  verdict: RegistryVerdict;
  source: string;
  request: RegistryCheckRequest;
  response: Record<string, unknown>;
  validUntil: Date | null;
}

export interface TaxiRegistryProvider {
  check(request: RegistryCheckRequest): Promise<RegistryCheckResult>;
}

export const TAXI_REGISTRY_PROVIDER = Symbol('TAXI_REGISTRY_PROVIDER');
