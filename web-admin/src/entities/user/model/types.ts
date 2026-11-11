import type { Role, UserStatus } from '@/shared/model/enums';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  photoUrl: string | null;
  role: Role;
  language: string;
  status: UserStatus;
  assignedRegionId: string | null;
  pdnConsentGiven: boolean;
  createdAt: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  user: User;
  isNewUser: boolean;
  requiresConsent: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

export interface OtpRequestResponse {
  expiresInSec: number;
  resendAfterSec: number;
  /** Возвращается сервером только вне production — для локальной разработки. */
  devCode?: string;
  method?: 'sms' | 'mobile-id';
  status?: 'pending' | 'otp_required' | 'confirmed' | 'failed';
}

export interface OtpStatusResponse {
  method: 'sms' | 'mobile-id';
  status: 'pending' | 'otp_required' | 'confirmed' | 'failed';
  accessToken?: string;
  refreshToken?: string;
  expiresInSec?: number;
  user?: User;
  isNewUser?: boolean;
  requiresConsent?: boolean;
}
