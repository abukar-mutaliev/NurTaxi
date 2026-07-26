/**
 * Перечисления домена Nur Taxi.
 *
 * Значения строк обязаны совпадать с серверными enum'ами
 * (`server/src/common/enums/*`, `server/src/modules/payments/enums/payment.enums.ts`).
 * При изменении на сервере правки вносятся здесь — это единственный источник истины для обоих
 * мобильных приложений.
 */

export const Role = {
  Client: 'client',
  Driver: 'driver',
  Operator: 'operator',
  RegionalAdmin: 'regional_admin',
  SuperAdmin: 'super_admin',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  Active: 'active',
  Blocked: 'blocked',
  Deleted: 'deleted',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** Конечный автомат заказа, requirements.md §12.1. */
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

export const PaymentMethod = {
  Cash: 'cash',
  Card: 'card',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const VerificationStatus = {
  Draft: 'draft',
  Pending: 'pending',
  InReview: 'in_review',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const DriverOnlineStatus = {
  Offline: 'offline',
  Online: 'online',
  Busy: 'busy',
} as const;
export type DriverOnlineStatus = (typeof DriverOnlineStatus)[keyof typeof DriverOnlineStatus];

export const DocumentStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

/** Обязательные документы водителя, requirements.md §8.2. */
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

export const PaymentStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Succeeded: 'succeeded',
  Failed: 'failed',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PayoutStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const NotificationChannel = {
  InApp: 'in_app',
  Push: 'push',
  Sms: 'sms',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const ReviewTarget = {
  Driver: 'driver',
  Client: 'client',
} as const;
export type ReviewTarget = (typeof ReviewTarget)[keyof typeof ReviewTarget];

export const ReviewTag = {
  Politeness: 'politeness',
  CleanCar: 'clean_car',
  SafeDriving: 'safe_driving',
} as const;
export type ReviewTag = (typeof ReviewTag)[keyof typeof ReviewTag];

export const FamilyMemberStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  Revoked: 'revoked',
} as const;
export type FamilyMemberStatus = (typeof FamilyMemberStatus)[keyof typeof FamilyMemberStatus];

/** Поддерживаемые языки интерфейса, requirements.md §24. */
export const AppLanguage = {
  Ru: 'ru',
  En: 'en',
  Ing: 'ing',
  Ce: 'ce',
} as const;
export type AppLanguage = (typeof AppLanguage)[keyof typeof AppLanguage];

/** Действие водителя в `POST /driver/orders/{id}/status`. */
export const DriverOrderAction = {
  EnRoute: 'en_route',
  Arrived: 'arrived',
  Start: 'start',
  Complete: 'complete',
} as const;
export type DriverOrderAction = (typeof DriverOrderAction)[keyof typeof DriverOrderAction];

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];
