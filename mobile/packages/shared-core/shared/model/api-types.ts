/**
 * Контракты REST API Nur Taxi (`requirements.md §14`, базовый путь `/api/v1`).
 *
 * Типы описаны по фактическим DTO сервера (`server/src/modules/**`). Сгруппированы по модулям,
 * названия полей совпадают с серверными один-в-один. Any здесь запрещён: если сервер отдаёт
 * произвольную структуру, используется `unknown` или `Record<string, unknown>`.
 */
import type {
  AppLanguage,
  DayKey,
  DocumentStatus,
  DocumentType,
  DriverOnlineStatus,
  DriverOrderAction,
  FamilyMemberStatus,
  NotificationChannel,
  OrderStatus,
  PaymentMethod,
  PayoutStatus,
  ReviewTag,
  ReviewTarget,
  Role,
  UserStatus,
  VerificationStatus,
} from './enums';

// ---------------------------------------------------------------------------
// Общие структуры
// ---------------------------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoLocation extends GeoPoint {
  address?: string;
}

/** Единый формат ошибки сервера (`AllExceptionsFilter`). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
}

export interface SuccessResponse {
  success: true;
}

/**
 * Сервер отдаёт коллекции плоскими массивами с необязательным `?limit`
 * (курсорной пагинации нет — см. `docs/mob.api-delta.md`).
 */
export interface LimitQuery {
  limit?: number;
}

// ---------------------------------------------------------------------------
// Auth — POST /auth/* (§14.1)
// ---------------------------------------------------------------------------

export interface OtpRequestPayload {
  phone: string;
}

export interface OtpRequestResponse {
  expiresInSec: number;
  resendAfterSec: number;
  /** Возвращается сервером только вне production — удобно для локальной разработки. */
  devCode?: string;
}

export interface OtpVerifyPayload {
  phone: string;
  code: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

export interface OtpVerifyResponse extends TokenPair {
  user: UserProfile;
  isNewUser: boolean;
  requiresConsent: boolean;
}

export interface RefreshPayload {
  refreshToken: string;
}

export type RefreshResponse = TokenPair;

export type LogoutPayload = RefreshPayload;

// ---------------------------------------------------------------------------
// Профиль — /me (§14.2)
// ---------------------------------------------------------------------------

export interface NotificationSettings {
  push: boolean;
  sms: boolean;
  email: boolean;
}

export interface PrivacySettings {
  shareTripWithFamily: boolean;
  showProfilePhoto: boolean;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  photoUrl: string | null;
  role: Role;
  language: string;
  status: UserStatus;
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  pdnConsentGiven: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
  photoUrl?: string;
  language?: AppLanguage;
  notificationSettings?: Partial<NotificationSettings>;
  privacySettings?: Partial<PrivacySettings>;
}

/** Согласие на обработку персональных данных, 152-ФЗ (`requirements.md §8.1`). */
export interface ConsentPayload {
  accepted: true;
  version?: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface CreateSavedAddressPayload {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface CreateEmergencyContactPayload {
  name: string;
  phone: string;
}

// ---------------------------------------------------------------------------
// Семейный аккаунт — /me/family (§8.6)
// ---------------------------------------------------------------------------

export interface FamilyPermissions {
  track: boolean;
  notify: boolean;
  pay: boolean;
}

export interface FamilyMember {
  id: string;
  memberPhone: string;
  memberUserId: string | null;
  relation: string;
  status: FamilyMemberStatus;
  permissions: FamilyPermissions;
  createdAt: string;
}

export interface AddFamilyMemberPayload extends Partial<FamilyPermissions> {
  regionId: string;
  phone: string;
  relation: string;
}

export interface ConfirmFamilyPayload {
  code: string;
}

// ---------------------------------------------------------------------------
// Промокоды и бонусы — /me/promo (§8.3)
// ---------------------------------------------------------------------------

export interface PromoBalance {
  balance: number;
  currency: string;
}

export interface RedeemPromoPayload {
  regionId: string;
  code: string;
}

export interface RedeemPromoResponse {
  bonusAmount: number;
}

// ---------------------------------------------------------------------------
// Уведомления — /me/notifications (§23)
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channel: NotificationChannel;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

// ---------------------------------------------------------------------------
// Регионы и города — /regions (§6.3)
// ---------------------------------------------------------------------------

export interface Region {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  featureFlags: Record<string, boolean>;
}

export interface City {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
}

// ---------------------------------------------------------------------------
// Гео — /geo/search (§8.9)
// ---------------------------------------------------------------------------

export interface GeoSearchQuery {
  q: string;
  regionId?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Заказы — /orders (§8.10–8.12)
// ---------------------------------------------------------------------------

export interface OrderRoute {
  polyline: string;
  distanceM: number;
  durationS: number;
}

export interface OrderPriceBreakdown {
  baseFare: number;
  distancePart: number;
  timePart: number;
  minPriceApplied: boolean;
  surgeMultiplier: number;
  subtotal: number;
  estimated: number;
  currency: string;
}

export interface TariffRef {
  id: string;
  name: string;
}

export interface OrderEstimatePayload {
  regionId: string;
  tariffId?: string;
  pickup: GeoLocation;
  dropoff: GeoLocation;
}

export interface OrderEstimate {
  route: OrderRoute;
  price: OrderPriceBreakdown;
  tariff: TariffRef;
  pickupEtaS: number;
}

export interface CreateOrderPayload extends OrderEstimatePayload {
  paymentMethod: PaymentMethod;
  comment?: string;
  familyMemberId?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  color: string;
  year: number;
}

export interface OrderDriver {
  id: string;
  fullName: string;
  rating: number;
  phone: string;
  vehicle: Vehicle | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  regionId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  priceEstimated: number;
  priceFinal: number | null;
  cancellationFee: number | null;
  paymentMethod: PaymentMethod;
  comment: string | null;
  familyMemberId: string | null;
  route: OrderRoute | null;
  tariff: TariffRef | null;
  driver: OrderDriver | null;
  createdAt: string;
}

export interface OrderHistoryItem {
  order: Order;
  receiptNumber: string | null;
  receiptAmount: number | null;
  reviews: { id: string; rating: number; target: ReviewTarget; text: string | null }[];
}

export interface CancelOrderPayload {
  reason?: string;
}

export interface SosResponse {
  success: boolean;
  sosEventId: string;
  contactsNotified: number;
  activatedAt: string;
}

export interface CreateReviewPayload {
  rating: 1 | 2 | 3 | 4 | 5;
  text?: string;
  tags?: ReviewTag[];
  isComplaint?: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  authorId: string;
  target: ReviewTarget;
  rating: number;
  text: string | null;
  tags: ReviewTag[];
  isComplaint: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Водитель — /driver (§14.3)
// ---------------------------------------------------------------------------

export interface VehiclePayload {
  make: string;
  model: string;
  plateNumber: string;
  color: string;
  year: number;
}

export interface RegisterDriverPayload {
  fullName: string;
  birthDate: string;
  residenceAddress: string;
  drivingExperienceYears: number;
  regionId: string;
  vehicle: VehiclePayload;
}

export type WorkSchedule = Partial<Record<DayKey, { from: string; to: string } | null>>;

export interface DriverDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  phone: string;
  photoUrl: string | null;
  fullName: string;
  birthDate: string;
  residenceAddress: string;
  drivingExperienceYears: number;
  regionId: string;
  verificationStatus: VerificationStatus;
  onlineStatus: DriverOnlineStatus;
  rating: number;
  tripsCount: number;
  balance: number;
  rejectionReason: string | null;
  workSchedule: WorkSchedule | null;
  vehicles: Vehicle[];
  documents: DriverDocument[];
  /** Сервер уже учёл верификацию и блокировки — на клиенте не пересчитываем. */
  canGoOnline: boolean;
}

export interface PresignDocumentPayload {
  type: DocumentType;
  contentType: string;
  fileName?: string;
}

export interface PresignDocumentResponse {
  uploadUrl: string;
  storageKey: string;
  expiresInSec: number;
}

export interface RegisterDocumentPayload {
  type: DocumentType;
  storageKey: string;
  contentType: string;
}

export interface UpdateDriverStatusPayload {
  status: Extract<DriverOnlineStatus, 'online' | 'offline'>;
}

export interface UpdateWorkSchedulePayload {
  workSchedule: WorkSchedule;
}

export type UpdateDriverLocationPayload = GeoPoint;

export interface DriverEarnings {
  balance: number;
  today: number;
  week: number;
  month: number;
}

export interface DriverOrderActionPayload {
  action: DriverOrderAction;
}

// ---------------------------------------------------------------------------
// Платежи — чеки и выплаты (§22)
// ---------------------------------------------------------------------------

export interface Receipt {
  id: string;
  orderId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  issuedAt: string;
  payload: Record<string, unknown>;
}

export interface RequestPayoutPayload {
  amount: number;
  /**
   * Сервер принимает ключ идемпотентности в теле запроса, а не в HTTP-заголовке.
   * Формируется автоматически в `entities/payment`.
   */
  idempotencyKey: string;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  requestedAt: string;
  processedAt: string | null;
}
