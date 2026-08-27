export const Role = {
  Client: 'client',
  Driver: 'driver',
  Operator: 'operator',
  RegionalAdmin: 'regional_admin',
  SuperAdmin: 'super_admin',
  Regulator: 'regulator',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ADMIN_ROLES: Role[] = [Role.SuperAdmin, Role.RegionalAdmin, Role.Operator, Role.Regulator];

export const OrderStatus = {
  Created: 'created',
  SearchingDriver: 'searching_driver',
  DriverAssigned: 'driver_assigned',
  DriverEnRoute: 'driver_en_route',
  DriverArrived: 'driver_arrived',
  InProgress: 'in_progress',
  Completed: 'completed',
  Closed: 'closed',
  CancelledByClient: 'cancelled_by_client',
  CancelledByDriver: 'cancelled_by_driver',
  CancelledSystem: 'cancelled_system',
  FailedPayment: 'failed_payment',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const VerificationStatus = {
  Draft: 'draft',
  Pending: 'pending',
  InReview: 'in_review',
  Approved: 'approved',
  Rejected: 'rejected',
  Blocked: 'blocked',
} as const;

export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const DocumentStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const DocumentType = {
  Passport: 'passport',
  License: 'license',
  Sts: 'sts',
  Osago: 'osago',
  CarPhoto: 'car_photo',
  InteriorPhoto: 'interior_photo',
  Selfie: 'selfie',
} as const;

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const ProviderType = {
  Payment: 'payment',
  Sms: 'sms',
  Maps: 'maps',
} as const;

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];

export const PaymentMethod = {
  Cash: 'cash',
  Card: 'card',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const UserStatus = {
  Active: 'active',
  Blocked: 'blocked',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
