import { Role } from '../../common/enums/role.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { DriverOnlineStatus } from '../../common/enums/driver-online-status.enum';
import { DocumentType } from '../../common/enums/document-type.enum';
import { OrderStatus, PaymentMethod } from '../../common/enums/order-status.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

/** Регион и тариф из миграций. */
export const INGUSHETIA_REGION_ID = '00000000-0000-4000-8000-000000000001';
export const STANDARD_TARIFF_ID = '00000000-0000-4000-8000-000000000101';

/** Фиксированные UUID тестовых сущностей (повторный запуск seed обновляет те же записи). */
export const SEED_IDS = {
  users: {
    superAdmin: '00000000-0000-4000-8000-000000000201',
    operator: '00000000-0000-4000-8000-000000000202',
    regionalAdmin: '00000000-0000-4000-8000-000000000203',
    client1: '00000000-0000-4000-8000-000000000211',
    client2: '00000000-0000-4000-8000-000000000212',
    driver1: '00000000-0000-4000-8000-000000000221',
    driver2: '00000000-0000-4000-8000-000000000222',
  },
  driverProfiles: {
    driver1: '00000000-0000-4000-8000-000000000321',
    driver2: '00000000-0000-4000-8000-000000000322',
  },
  vehicles: {
    driver1: '00000000-0000-4000-8000-000000000421',
    driver2: '00000000-0000-4000-8000-000000000422',
  },
  orders: {
    active: '00000000-0000-4000-8000-000000000501',
    completed: '00000000-0000-4000-8000-000000000502',
    cancelled: '00000000-0000-4000-8000-000000000503',
  },
  savedAddresses: {
    client1Home: '00000000-0000-4000-8000-000000000601',
    client1Work: '00000000-0000-4000-8000-000000000602',
  },
  emergencyContacts: {
    client1: '00000000-0000-4000-8000-000000000701',
  },
  familyMembers: {
    client1Client2: '00000000-0000-4000-8000-000000000801',
  },
} as const;

export interface SeedUserDef {
  id: string;
  phone: string;
  name: string;
  role: Role;
}

export const SEED_USERS: SeedUserDef[] = [
  {
    id: SEED_IDS.users.superAdmin,
    phone: '+79000000001',
    name: 'Суперадмин Nur Taxi',
    role: Role.SuperAdmin,
  },
  {
    id: SEED_IDS.users.operator,
    phone: '+79000000002',
    name: 'Оператор модерации',
    role: Role.Operator,
  },
  {
    id: SEED_IDS.users.regionalAdmin,
    phone: '+79000000003',
    name: 'Региональный админ',
    role: Role.RegionalAdmin,
  },
  {
    id: SEED_IDS.users.client1,
    phone: '+79280000001',
    name: 'Ахмед Т.',
    role: Role.Client,
  },
  {
    id: SEED_IDS.users.client2,
    phone: '+79280000002',
    name: 'Марьям К.',
    role: Role.Client,
  },
  {
    id: SEED_IDS.users.driver1,
    phone: '+79280000011',
    name: 'Ислам М.',
    role: Role.Driver,
  },
  {
    id: SEED_IDS.users.driver2,
    phone: '+79280000012',
    name: 'Руслан Б.',
    role: Role.Driver,
  },
];

export interface SeedDriverDef {
  profileId: string;
  userId: string;
  vehicleId: string;
  fullName: string;
  plateNumber: string;
  verificationStatus: VerificationStatus;
  onlineStatus: DriverOnlineStatus;
  rating: string;
  tripsCount: number;
}

export const SEED_DRIVERS: SeedDriverDef[] = [
  {
    profileId: SEED_IDS.driverProfiles.driver1,
    userId: SEED_IDS.users.driver1,
    vehicleId: SEED_IDS.vehicles.driver1,
    fullName: 'Ислам Магомедов',
    plateNumber: '06АА1234',
    verificationStatus: VerificationStatus.Approved,
    onlineStatus: DriverOnlineStatus.Online,
    rating: '4.95',
    tripsCount: 128,
  },
  {
    profileId: SEED_IDS.driverProfiles.driver2,
    userId: SEED_IDS.users.driver2,
    vehicleId: SEED_IDS.vehicles.driver2,
    fullName: 'Руслан Беков',
    plateNumber: '06ВВ5678',
    verificationStatus: VerificationStatus.Approved,
    onlineStatus: DriverOnlineStatus.Online,
    rating: '5.00',
    tripsCount: 0,
  },
];

export const SEED_DOCUMENT_TYPES = [
  DocumentType.Passport,
  DocumentType.License,
  DocumentType.Sts,
  DocumentType.Osago,
  DocumentType.CarPhoto,
  DocumentType.InteriorPhoto,
  DocumentType.Selfie,
] as const;

export interface SeedOrderDef {
  id: string;
  clientId: string;
  driverId: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  priceEstimated: string;
  priceFinal: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  comment: string | null;
}

export const SEED_ORDERS: SeedOrderDef[] = [
  {
    id: SEED_IDS.orders.active,
    clientId: SEED_IDS.users.client1,
    driverId: SEED_IDS.driverProfiles.driver1,
    status: OrderStatus.DriverEnRoute,
    paymentMethod: PaymentMethod.Cash,
    priceEstimated: '249.00',
    priceFinal: null,
    pickupAddress: 'г. Назрань, ул. Московская, 12',
    dropoffAddress: 'г. Назрань, пр. Базорканова, 45',
    pickupLat: 43.2167,
    pickupLng: 44.7667,
    dropoffLat: 43.22,
    dropoffLng: 44.77,
    comment: 'У подъезда №2',
  },
  {
    id: SEED_IDS.orders.completed,
    clientId: SEED_IDS.users.client1,
    driverId: SEED_IDS.driverProfiles.driver1,
    status: OrderStatus.Closed,
    paymentMethod: PaymentMethod.Card,
    priceEstimated: '189.00',
    priceFinal: '189.00',
    pickupAddress: 'г. Магас, ул. Ленина, 3',
    dropoffAddress: 'г. Магас, ул. Гайрбекова, 18',
    pickupLat: 43.1667,
    pickupLng: 44.8,
    dropoffLat: 43.17,
    dropoffLng: 44.805,
    comment: null,
  },
  {
    id: SEED_IDS.orders.cancelled,
    clientId: SEED_IDS.users.client2,
    driverId: null,
    status: OrderStatus.CancelledByClient,
    paymentMethod: PaymentMethod.Cash,
    priceEstimated: '149.00',
    priceFinal: null,
    pickupAddress: 'г. Карабулак, ул. Осканова, 7',
    dropoffAddress: 'г. Карабулак, ул. Шерипова, 21',
    pickupLat: 43.3056,
    pickupLng: 44.9083,
    dropoffLat: 43.31,
    dropoffLng: 44.91,
    comment: 'Передумал',
  },
];

export const PDN_CONSENT_VERSION = '2026-01';

export const USER_DEFAULTS = {
  language: 'ru',
  status: UserStatus.Active,
} as const;
