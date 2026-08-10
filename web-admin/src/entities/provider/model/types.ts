import type { ProviderType } from '@/shared/model/enums';

export interface ProviderConfig {
  id: string;
  regionId: string;
  type: ProviderType;
  provider: string;
  credentialsRef: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderDto {
  regionId: string;
  type: ProviderType;
  provider: string;
  credentialsRef: string;
  config?: Record<string, unknown>;
}

export interface UpdateProviderDto {
  provider?: string;
  credentialsRef?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}
