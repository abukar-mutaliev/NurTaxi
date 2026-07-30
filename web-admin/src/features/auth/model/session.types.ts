import type { User } from '@/entities/user';

export interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  selectedRegionId: string | null;
}

export const initialSessionState: SessionState = {
  user: null,
  isAuthenticated: false,
  isBootstrapped: false,
  selectedRegionId: null,
};
